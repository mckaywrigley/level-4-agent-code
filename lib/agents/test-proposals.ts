/**
 * This file handles creation or update of test files.
 * Key change: We'll gather existing tests from the local filesystem, not from GitHub.
 */

import { generateObject } from "ai"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { ReviewAnalysis } from "./code-review"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"

// The shape of the test proposals we expect from the LLM
const testProposalsSchema = z.object({
  testProposals: z.array(
    z.object({
      filename: z.string(),
      testContent: z.string(),
      actions: z.object({
        action: z.enum(["create", "update", "rename"]),
        oldFilename: z.string()
      })
    })
  )
})

export interface TestProposal {
  filename: string
  testContent: string
  actions: {
    action: "create" | "update" | "rename"
    oldFilename: string
  }
}

/**
 * handleTestGeneration:
 * - Posts a status update comment about generating tests.
 * - Calls generateTestsForChanges to produce new or updated test files from the LLM.
 * - Then commits those changes to the PR branch (via local commits).
 * - Finally updates the comment with the list of new/updated test files.
 */
export async function handleTestGeneration(
  octokit: any,
  context: PullRequestContextWithTests,
  reviewAnalysis: ReviewAnalysis | undefined,
  testCommentId: number,
  testBody: string
) {
  testBody += "\n\n**Generating Tests**..."
  await updateComment(octokit, context, testCommentId, testBody)

  let recommendation = ""
  if (reviewAnalysis) {
    recommendation = `Review Analysis:\n${reviewAnalysis.summary}`
  }

  // We get an array of test proposals from the AI
  const proposals = await generateTestsForChanges(context, recommendation)

  if (proposals.length > 0) {
    // We commit each test file creation/update locally
    await commitTestsLocally(proposals)
    testBody += "\n\n**Proposed new/updated tests:**\n"
    for (const p of proposals) {
      testBody += `- ${p.filename}\n`
    }
  } else {
    testBody += "\n\nNo new test proposals from AI."
  }

  await updateComment(octokit, context, testCommentId, testBody)
}

/**
 * generateTestsForChanges:
 * - Builds a combined prompt detailing changed files, existing tests, etc.
 * - Asks LLM to propose new or updated test files in strict JSON schema.
 */
async function generateTestsForChanges(
  context: PullRequestContextWithTests,
  recommendation: string
): Promise<TestProposal[]> {
  const existingTestsPrompt = context.existingTestFiles
    .map(f => `Existing test: ${f.filename}\n---\n${f.content}`)
    .join("\n")

  const changedFilesPrompt = context.changedFiles
    .map(file => {
      if (file.excluded) return `File: ${file.filename} [EXCLUDED FROM PROMPT]`
      return `File: ${file.filename}\nPatch:\n${file.patch}\nContent:\n${file.content}`
    })
    .join("\n---\n")

  const prompt = `
You are an expert developer specializing in test generation.

Only generate tests for frontend code in /app.
Only generate unit tests in __tests__/unit.

IMPORTANT:
- If the code references React/JSX, name test files .test.tsx
- Always import '@testing-library/jest-dom' and '@testing-library/react'
- Return JSON only with structure:
{
  "testProposals": [
    {
      "filename": "string",
      "testContent": "string",
      "actions": {
        "action": "create" | "update" | "rename",
        "oldFilename": "string"
      }
    }
  ]
}

Recommendation:
${recommendation}

Title: ${context.title}
Commits:
${context.commitMessages.map(m => `- ${m}`).join("\n")}
Changed Files:
${changedFilesPrompt}
Existing Tests:
${existingTestsPrompt}
`
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Test proposals prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)
  const modelInfo = getLLMModel()
  try {
    const result = await generateObject({
      model: modelInfo,
      schema: testProposalsSchema,
      schemaName: "testProposals",
      schemaDescription: "Proposed test files in JSON",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(
      `Test proposals result:\n${JSON.stringify(result.object, null, 2)}`
    )
    console.log(`--------------------------------\n\n\n\n\n`)
    return finalizeTestProposals(result.object.testProposals, context)
  } catch (err) {
    return []
  }
}

/**
 * finalizeTestProposals:
 * - Adjusts test file naming or paths to .test.tsx or .test.ts
 * - Ensures tests end up under __tests__/unit/
 * - If we have both .test.ts and .test.tsx for same base, prefer .test.tsx
 */
function finalizeTestProposals(
  rawProposals: TestProposal[],
  context: PullRequestContextWithTests
): TestProposal[] {
  // Attempt to detect React code. If there's a changed file with .tsx or import React, assume React test.
  const isReact = context.changedFiles.some(file => {
    if (!file.content) return false
    return (
      file.filename.endsWith(".tsx") ||
      file.content.includes("import React") ||
      file.content.includes('from "react"')
    )
  })

  let proposals = rawProposals.map(proposal => {
    let newFilename = proposal.filename
    if (isReact && !newFilename.endsWith(".test.tsx")) {
      newFilename = newFilename.replace(/\.test\.ts$/, ".test.tsx")
    } else if (!isReact && !newFilename.endsWith(".test.ts")) {
      newFilename = newFilename.replace(/\.test\.tsx$/, ".test.ts")
    }

    if (!newFilename.includes("__tests__/unit")) {
      newFilename = `__tests__/unit/${newFilename}`
    }
    return { ...proposal, filename: newFilename }
  })

  // Remove duplicates if we have both .test.ts and .test.tsx for the same base name
  const seenBases = new Map<string, TestProposal>()
  const filtered: TestProposal[] = []

  for (const proposal of proposals) {
    const baseName = proposal.filename.replace(/\.test\.tsx?$/, "")
    const existing = seenBases.get(baseName)
    if (!existing) {
      seenBases.set(baseName, proposal)
      filtered.push(proposal)
    } else {
      const oldIsTsx = existing.filename.endsWith(".test.tsx")
      const newIsTsx = proposal.filename.endsWith(".test.tsx")

      if (newIsTsx && !oldIsTsx) {
        const indexToRemove = filtered.indexOf(existing)
        if (indexToRemove !== -1) {
          filtered.splice(indexToRemove, 1)
        }
        filtered.push(proposal)
        seenBases.set(baseName, proposal)
      }
    }
  }
  return filtered
}

/**
 * commitTestsLocally:
 * - Writes or updates the test files on the local disk.
 * - Does NOT push them directly; we rely on the main flow to do the local commit/push steps.
 */
async function commitTestsLocally(proposals: TestProposal[]) {
  for (const p of proposals) {
    // If rename, remove the old file from local if it exists
    if (
      p.actions?.action === "rename" &&
      p.actions.oldFilename &&
      p.actions.oldFilename !== p.filename
    ) {
      const oldPath = path.join(process.cwd(), p.actions.oldFilename)
      if (fs.existsSync(oldPath)) {
        fs.rmSync(oldPath)
      }
    }

    // Write the new or updated file
    const localPath = path.join(process.cwd(), p.filename)
    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    fs.writeFileSync(localPath, p.testContent, "utf-8")
  }
}
