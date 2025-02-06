/**
 * This file handles the creation or update of tests based on the PR changes.
 *
 * Steps:
 *  1) We combine the changed files, existing tests, and any additional context (like code review).
 *  2) We prompt the LLM to propose new or updated tests in a strict JSON schema.
 *  3) We parse that schema, then commit the test changes to the PR branch on GitHub.
 */

import { generateObject } from "ai"
import { Buffer } from "buffer"
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

// We define the TypeScript interface for convenience
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
 * - Then commits those changes to the PR branch with commitTests.
 * - Finally updates the comment with the list of newly created/updated test files.
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
    // We commit each test file creation/update
    await commitTests(
      octokit,
      context.owner,
      context.repo,
      context.headRef,
      proposals
    )
    testBody += "\n\n**Proposed new/updated tests:**\n"
    for (const p of proposals) {
      testBody += `- ${p.filename}\n`
    }
  } else {
    testBody += "\n\nNo new test proposals from AI."
  }

  // Update the comment on GitHub
  await updateComment(octokit, context, testCommentId, testBody)
}

/**
 * generateTestsForChanges:
 * - Builds a combined prompt detailing changed files and any existing tests.
 * - Asks the LLM to produce JSON describing proposed test changes.
 * - Uses the testProposalsSchema to parse the LLM response.
 * - Then calls finalizeTestProposals to handle naming conventions (e.g. .test.ts vs .test.tsx).
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

  // The LLM prompt: includes the code changes, existing tests, and any recommended improvements from code review
  const prompt = `
You are an expert developer specializing in test generation.

You only generate tests for frontend related code in the /app directory.

You only generate unit tests in the __tests__/unit directory.

Return only valid JSON matching this structure:
{
  "testProposals": [
    {
      "filename": "string",
      "testContent": "string",
      "actions": {
        "action": "create" or "update" or "rename",
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
    // Attempt to parse the LLM's JSON into our schema
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
    // If there's a parse error, we return an empty array (meaning no proposals)
    return []
  }
}

/**
 * finalizeTestProposals:
 * - Adjusts test file naming or paths to ensure they adhere to typical patterns (e.g. .test.tsx for React).
 * - Ensures tests end up under __tests__/unit/ if not specified.
 */
function finalizeTestProposals(
  rawProposals: TestProposal[],
  context: PullRequestContextWithTests
): TestProposal[] {
  return rawProposals.map(proposal => {
    // Decide if it's a React-based test. If any changed file is .tsx or references React, we assume yes.
    const isReact = context.changedFiles.some(file => {
      if (!file.content) return false
      return (
        file.filename.endsWith(".tsx") ||
        file.content.includes("import React") ||
        file.content.includes('from "react"') ||
        file.filename.includes("app/")
      )
    })

    let newFilename = proposal.filename

    // Enforce the .test.tsx or .test.ts extension
    if (isReact && !newFilename.endsWith(".test.tsx")) {
      newFilename = newFilename.replace(/\.test\.ts$/, ".test.tsx")
    } else if (!isReact && !newFilename.endsWith(".test.ts")) {
      newFilename = newFilename.replace(/\.test\.tsx$/, ".test.ts")
    }

    // Ensure the file is placed in __tests__/unit if not already
    if (!newFilename.includes("__tests__/unit")) {
      newFilename = `__tests__/unit/${newFilename}`
    }

    return { ...proposal, filename: newFilename }
  })
}

/**
 * commitTests:
 * - For each test proposal, we either create or update the file in the PR branch.
 * - We also handle "rename" actions by deleting the old file.
 * - This is where we actually push commits back to GitHub using Octokit.
 */
/**
 * Commits test files to both GitHub repository and local filesystem
 * @param octokit - GitHub API client
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param branch - Target branch name
 * @param proposals - Array of test proposals to commit
 */
async function commitTests(
  octokit: any,
  owner: string,
  repo: string,
  branch: string,
  proposals: TestProposal[]
) {
  for (const p of proposals) {
    // Handle file renames by deleting the old file first
    if (
      p.actions?.action === "rename" &&
      p.actions.oldFilename &&
      p.actions.oldFilename !== p.filename
    ) {
      try {
        const { data: oldFile } = await octokit.repos.getContent({
          owner,
          repo,
          path: p.actions.oldFilename,
          ref: branch
        })
        if ("sha" in oldFile) {
          await octokit.repos.deleteFile({
            owner,
            repo,
            path: p.actions.oldFilename,
            message: `Rename ${p.actions.oldFilename} to ${p.filename}`,
            branch,
            sha: oldFile.sha
          })
        }
      } catch (err: any) {
        // Ignore 404 errors if old file doesn't exist
        if (err.status !== 404) throw err
      }
    }

    // Encode file content to base64 for GitHub API
    const encoded = Buffer.from(p.testContent, "utf8").toString("base64")

    try {
      // Try to get existing file to update it
      const { data: existingFile } = await octokit.repos.getContent({
        owner,
        repo,
        path: p.filename,
        ref: branch
      })

      // Update existing file if found
      if ("sha" in existingFile) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: p.filename,
          message: `Add/Update tests: ${p.filename}`,
          content: encoded,
          branch,
          sha: existingFile.sha
        })
      }
    } catch (error: any) {
      // Create new file if 404 (doesn't exist)
      if (error.status === 404) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: p.filename,
          message: `Add/Update tests: ${p.filename}`,
          content: encoded,
          branch
        })
      } else {
        throw error
      }
    }

    // Write file to local filesystem as well
    const localPath = path.join(process.cwd(), p.filename)
    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    fs.writeFileSync(localPath, p.testContent, "utf-8")
  }
}
