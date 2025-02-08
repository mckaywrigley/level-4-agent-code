/**
 * test-proposals.ts
 * --------------------------------------------------------------------
 * Handles creation or update of test files when implementing
 * or expanding test coverage for changed code.
 *
 * For normal "new feature" test generation:
 *   - The user changed or added code
 *   - The gating step decides we need new or updated tests
 *   - We call handleTestGeneration(...), which:
 *       1) Gathers proposals from the LLM
 *       2) Writes them to disk
 *       3) Commits them
 *
 * The actual logic to *fix* failing tests after they've been written
 * is in `test-fix.ts`, which is a separate flow.
 * --------------------------------------------------------------------
 */

import { generateObject } from "ai"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { ReviewAnalysis } from "./code-review"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"
import { commitChanges } from "./text-to-feature"

// -------------------------------------
// 1) Zod schema for test proposals
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
// 2) Definition of a TestProposal
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
 * ------------------------------------------------------------------
 * This is called if gating says we do need new tests for the
 * changed code.
 * Steps:
 *   1) Post an update to the PR comment.
 *   2) Use generateTestsForChanges(...) to get an array of
 *      new or updated test files.
 *   3) Write them locally, commit & push them.
 *   4) Update the PR comment with the final list of new tests.
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

  // Possibly incorporate code review suggestions
  let recommendation = ""
  if (reviewAnalysis) {
    recommendation = `Review Analysis:\n${reviewAnalysis.summary}`
  }

  // 1) Generate the test proposals
  const proposals = await generateTestsForChanges(context, recommendation)

  // 2) If proposals, write them, commit them
  if (proposals.length > 0) {
    await commitTestsLocally(proposals)
    commitChanges("AI test generation - final pass")

    // Update PR comment
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
 * ------------------------------------------------------------------
 * Builds a prompt with the changed files, existing tests,
 * and review feedback. Asks the LLM to propose new or updated tests
 * in a JSON format.
 */
export async function generateTestsForChanges(
  context: PullRequestContextWithTests,
  recommendation: string
): Promise<TestProposal[]> {
  // Summaries of existing tests
  const existingTestsPrompt = context.existingTestFiles
    .map(f => `Existing test: ${f.filename}\n---\n${f.content}`)
    .join("\n")

  // Summaries of changed files
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
  console.log(`\n--- Test Generation Prompt ---\n${prompt}\n---`)

  const modelInfo = getLLMModel()
  try {
    const result = await generateObject({
      model: modelInfo,
      schema: testProposalsSchema,
      schemaName: "testProposals",
      schemaDescription: "Proposed test files in JSON",
      prompt
    })

    console.log(
      `\n--- Test Generation Result ---\n${JSON.stringify(result.object, null, 2)}\n---`
    )
    return result.object.testProposals
  } catch (err) {
    return []
  }
}

/**
 * commitTestsLocally:
 * ------------------------------------------------------------------
 * Takes the array of test proposals (each containing a filename
 * and content) and writes them to disk. If the "action" is "rename",
 * we remove the old file first. We do not auto-delete or handle
 * older tests unless explicitly told to rename or update them.
 *
 * This doesn't commit them to Git automatically; the caller must
 * call commitChanges(...) to finalize them in the repo.
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

    // Write or overwrite the file
    const localPath = path.join(process.cwd(), p.filename)
    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    fs.writeFileSync(localPath, p.testContent, "utf-8")
  }
}
