/**
 * This file orchestrates the overall AI agent flow, from code review to test generation and iterative test fixing.
 *
 * Flow breakdown:
 *  1) We fetch GitHub context data (the PR details, changed files, etc.).
 *  2) We post a placeholder comment and update it with review content (handleReviewAgent).
 *  3) We check if we should generate tests (gatingStep).
 *  4) If yes, we generate new tests or update existing ones (handleTestGeneration).
 *  5) Then we run local tests (runLocalTests).
 *  6) If the tests fail, we attempt a fix up to X iterations (handleTestFix).
 *  7) Ultimately, if the tests pass, we post success. Otherwise, we fail the Action.
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
 * runFlow is the main entry point called by ai-flow.ts to coordinate everything.
 * - It reads the GitHub event data to ensure it's a pull request event.
 * - Gathers the PR context, calls the code review logic, test gating, test generation, and test fix loops.
 * - In short, this is the "brain" function that ties all submodules together.
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

  // Reading the event payload to see if it's a pull_request event
  const eventData = JSON.parse(fs.readFileSync(eventPath, "utf8"))
  const pullRequest = eventData.pull_request
  if (!pullRequest) {
    console.error("Not a pull_request event. Exiting.")
    return
  }

  // GITHUB_REPOSITORY is typically "owner/repo", e.g. "my-org/my-repo"
  const repoStr = process.env.GITHUB_REPOSITORY
  if (!repoStr) {
    console.error("No GITHUB_REPOSITORY found. Exiting.")
    return
  }

  const [owner, repo] = repoStr.split("/")
  const prNumber = pullRequest.number

  // We use Octokit to interact with GitHub
  const octokit = new Octokit({ auth: githubToken })

  // Step 1: Build a context object describing the PR (title, changed files, commit messages, etc.)
  const baseContext = await buildPRContext(octokit, owner, repo, prNumber)

  // Step 2: Create a placeholder "AI Code Review" comment to be updated
  let reviewBody = "### AI Code Review\n_(initializing...)_"
  const reviewCommentId = await createComment(octokit, baseContext, reviewBody)

  // Step 3: Call our code review logic, which updates the placeholder with actual data
  const reviewAnalysis: ReviewAnalysis | undefined = await handleReviewAgent(
    octokit,
    baseContext,
    reviewCommentId,
    reviewBody
  )

  // Step 4: Create a second placeholder comment for "AI Test Generation"
  let testBody = "### AI Test Generation\n_(initializing...)_"
  const testCommentId = await createComment(octokit, baseContext, testBody)

  // Step 5: Build a test context (includes existing test files, etc.)
  const testContext = await buildTestContext(octokit, baseContext)

  // Step 6: Decide if test generation is needed (the "gating" step).
  const gating = await gatingStep(
    testContext,
    octokit,
    testCommentId,
    testBody,
    reviewAnalysis
  )

  // If gating says we don't need tests, do not generate tests and skip to running tests
  if (!gating.shouldGenerate) {
    testBody = gating.testBody
    testBody +=
      "\n\nSkipping test generation as existing tests are sufficient. Running tests..."
    await updateComment(octokit, baseContext, testCommentId, testBody)
  } else {
    // If gating says we should proceed, we handle test generation
    testBody = gating.testBody
    await handleTestGeneration(
      octokit,
      testContext,
      reviewAnalysis,
      testCommentId,
      testBody
    )
  }

  // Step 7: After generating tests, we run them locally to see if they pass.
  let testResult = runLocalTests()

  // We allow up to maxIterations attempts to fix failing tests automatically
  let iteration = 0
  const maxIterations = 3

  while (testResult.jestFailed && iteration < maxIterations) {
    iteration++
    testBody += `\n\n**Test Fix #${iteration}**\nTests are failing. Attempting a fix...`
    await updateComment(octokit, baseContext, testCommentId, testBody)

    // Attempt to fix the failing tests by generating new or updated test code
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

  // If eventually all tests pass, we celebrate
  if (!testResult.jestFailed) {
    testBody += "\n\n✅ All tests passing after AI generation/fixes!"
    await updateComment(octokit, baseContext, testCommentId, testBody)
    process.exit(0)
  } else {
    // If we've run out of fix attempts and they still fail, we fail the action
    testBody += `\n\n❌ Tests failing after ${maxIterations} fix attempts.`
    await updateComment(octokit, baseContext, testCommentId, testBody)
    process.exit(1)
  }
}
