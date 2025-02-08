/**
 * Handles creation or update of test files for normal (new) test generation.
 * Also exports the zod schema and TestProposal interface for reuse in fix flows.
 */

import { generateObject } from "ai"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { ReviewAnalysis } from "./code-review"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"

// -------------------------------------
// 1) Export the schema so we can reuse
// -------------------------------------
export const testProposalsSchema = z.object({
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

// -------------------------------------
// 2) Export the TestProposal interface
// -------------------------------------
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
 * - Called when we want to do “normal” new or updated tests after code changes
 * - Gathers proposals, commits them, and updates the GitHub PR comment.
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

  // Generate proposals with the normal flow
  const proposals = await generateTestsForChanges(context, recommendation)

  if (proposals.length > 0) {
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
 * - Builds a prompt for normal (new) test generation based on changed files, existing tests, etc.
 */
export async function generateTestsForChanges(
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
    {"filename":"...", "testContent":"...", "actions": { "action":"create","oldFilename":""}}
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

  const modelInfo = getLLMModel()
  try {
    const result = await generateObject({
      model: modelInfo,
      schema: testProposalsSchema,
      schemaName: "testProposals",
      schemaDescription: "Proposed test files in JSON",
      prompt
    })
    return result.object.testProposals
  } catch (err) {
    return []
  }
}

/**
 * commitTestsLocally:
 * - Writes or updates each test file on disk.
 * - We do not push them from here; the main flow does commits.
 */
export async function commitTestsLocally(proposals: TestProposal[]) {
  for (const p of proposals) {
    // If rename, remove the old file if it exists
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

    // Write/overwrite the file
    const localPath = path.join(process.cwd(), p.filename)
    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    fs.writeFileSync(localPath, p.testContent, "utf-8")
  }
}
