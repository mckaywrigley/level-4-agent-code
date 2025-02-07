/*
<ai_context>
This module previously orchestrated a PR-based flow. Now, we add a "local" run
option so we can reuse the review/test steps in a non-PR context if needed.
</ai_context>
*/

import { Octokit } from "@octokit/rest"
import * as fs from "fs"
import { handleReviewAgent, ReviewAnalysis } from "./code-review"
import { createComment, updateComment } from "./github-comments"
import { buildPRContext, buildTestContext } from "./pr-context"
import { handleTestFix } from "./test-fix"
import { gatingStep } from "./test-gating"
import { handleTestGeneration } from "./test-proposals"
import { runLocalTests } from "./test-runner"

/**
 * runFlow:
 * - The original function that is triggered by a pull request event.
 * - This does the entire logic:
 *   1) Build PR context
 *   2) Post initial code review
 *   3) Possibly generate tests
 *   4) Run tests
 *   5) If failing, do iterative fix attempts
 *   6) If eventually passing, succeed; if not, fail the job
 */
export async function runFlow() {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    console.error("Missing GITHUB_TOKEN - cannot proceed.")
    process.exit(1)
  }

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) {
    console.error("No GITHUB_EVENT_PATH found. Not in GitHub Actions? Exiting.")
    return
  }

  // Attempt to parse the event data to see if it's a pull_request
  const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"))
  const pullRequest = eventData.pull_request
  if (!pullRequest) {
    console.error("Not a pull_request event. Exiting.")
    return
  }

  const repoStr = process.env.GITHUB_REPOSITORY
  if (!repoStr) {
    console.error("No GITHUB_REPOSITORY found. Exiting.")
    return
  }

  const [owner, repo] = repoStr.split("/")
  const prNumber = pullRequest.number
  const octokit = new Octokit({ auth: githubToken })

  // 1) Build PR context data
  const baseContext = await buildPRContext(octokit, owner, repo, prNumber)

  // 2) Create a "AI Code Review" comment placeholder
  let reviewBody = "### AI Code Review\n_(initializing...)_"
  const reviewCommentId = await createComment(octokit, baseContext, reviewBody)

  // 3) Perform the code review step
  const reviewAnalysis: ReviewAnalysis | undefined = await handleReviewAgent(
    octokit,
    baseContext,
    reviewCommentId,
    reviewBody
  )

  // 4) Create an "AI Test Generation" comment placeholder
  let testBody = "### AI Test Generation\n_(initializing...)_"
  const testCommentId = await createComment(octokit, baseContext, testBody)

  // 5) Build test context (fetch existing test files)
  const testContext = await buildTestContext(octokit, baseContext)

  // 6) Decide if we should generate tests or skip
  const gating = await gatingStep(
    testContext,
    octokit,
    testCommentId,
    testBody,
    reviewAnalysis
  )

  if (!gating.shouldGenerate) {
    // If gating says skip, we simply run tests with existing coverage
    testBody = gating.testBody
    testBody +=
      "\n\nSkipping test generation as existing tests are sufficient. Running tests..."
    await updateComment(octokit, baseContext, testCommentId, testBody)
  } else {
    // Otherwise, generate new/updated tests
    testBody = gating.testBody
    await handleTestGeneration(
      octokit,
      testContext,
      reviewAnalysis,
      testCommentId,
      testBody
    )
  }

  // 7) Run tests locally to see if they pass
  let testResult = runLocalTests()

  // 8) If failing, attempt iterative fixes up to 3 times
  let iteration = 0
  const maxIterations = 3

  while (testResult.jestFailed && iteration < maxIterations) {
    iteration++
    testBody += `\n\n**Test Fix #${iteration}**\nTests are failing. Attempting a fix...`
    await updateComment(octokit, baseContext, testCommentId, testBody)

    await handleTestFix(
      octokit,
      testContext,
      iteration,
      testResult.output,
      testCommentId,
      testBody
    )

    // Re-run tests after fix attempt
    testResult = runLocalTests()
  }

  // 9) If eventually passing, we update the comment with success
  if (!testResult.jestFailed) {
    testBody += "\n\n✅ All tests passing after AI generation/fixes!"
    await updateComment(octokit, baseContext, testCommentId, testBody)
    process.exit(0)
  } else {
    // 10) If we still fail after maxIterations, we post a final failure message
    testBody += `\n\n❌ Tests failing after ${maxIterations} fix attempts.`
    await updateComment(octokit, baseContext, testCommentId, testBody)
    process.exit(1)
  }
}

/**
 * runLocalFlow:
 * - A simplified version that doesn't require a PR context or GitHub comments.
 * - We run local tests, and if failing, do up to 3 fix attempts by prompting the LLM.
 * - If eventually passing, we return true, otherwise false.
 */
export function runLocalFlow(): boolean {
  console.log("Running local flow (no PR context).")

  // 1) Run tests
  let testResult = runLocalTests()
  if (!testResult.jestFailed) {
    console.log("All tests already passing. No AI fix needed.")
    return true
  }

  // 2) If failing, do iterative fix attempts
  let iteration = 0
  const maxIterations = 3

  while (testResult.jestFailed && iteration < maxIterations) {
    iteration++
    console.log(`**Test Fix #${iteration}** - Attempting fix...`)

    // We call handleTestFix, but pass dummy data for the GitHub arguments, since we're local.
    handleTestFix(
      null as any,
      {
        owner: "",
        repo: "",
        pullNumber: 0,
        headRef: "",
        baseRef: "",
        title: "",
        changedFiles: [],
        commitMessages: [],
        existingTestFiles: []
      },
      iteration,
      testResult.output,
      0,
      ""
    )

    testResult = runLocalTests()
  }

  // 3) If still failing, we return false
  if (testResult.jestFailed) {
    console.error(`Tests still failing after ${maxIterations} attempts.`)
    return false
  }

  // 4) Otherwise, success
  console.log("Tests passing after AI fix attempts!")
  return true
}
