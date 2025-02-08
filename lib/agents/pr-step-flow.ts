/*
pr-step-flow.ts
----------------------------------------------------------------------
Provides a function `runFlowOnPR` which performs a *full* review/test 
workflow for the entire PR as it stands. This is typically done after 
all partial steps are complete, ensuring the final code is stable.

It does:
 1) Code review (AI)
 2) Test gating check (decides if we need new or updated tests)
 3) Test generation (if needed)
 4) Local test run
 5) If tests fail, iterative "test fix" attempts
----------------------------------------------------------------------
*/

import { Octokit } from "@octokit/rest"
import { handleReviewAgent, ReviewAnalysis } from "./code-review"
import { createComment, updateComment } from "./github-comments"
import { buildPRContext, buildTestContext } from "./pr-context"
import { handleTestFix } from "./test-fix"
import { gatingStep } from "./test-gating"
import { handleTestGeneration } from "./test-proposals"
import { runLocalTests } from "./test-runner"

/**
 * runFlowOnPR:
 * ------------------------------------------------------------------
 * High-level orchestration of the final AI review and test pass
 * for an entire pull request.
 *
 * Steps:
 *  1) Build the full PR context from local diffs (base..HEAD).
 *  2) Post an "AI Code Review" comment stub, then fill it in with the actual review.
 *  3) Post an "AI Test Generation" comment stub.
 *  4) Build a test context (including existing tests).
 *  5) Gating step => decides if we need more tests. If yes, propose them.
 *  6) Run local tests.
 *  7) If failing, do iterative test fix attempts (up to 3).
 *  8) Return true if eventually passing, false otherwise.
 *
 * @param octokit     The Octokit client
 * @param owner       The repo owner
 * @param repo        The repo name
 * @param pullNumber  The PR number
 * @returns           true if final tests pass, false otherwise
 */
export async function runFlowOnPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  // 1) Build local PR context (all changes)
  const baseContext = await buildPRContext(owner, repo, pullNumber)

  // 2) Post a placeholder code review comment, then do the AI review
  let reviewBody = "### AI Code Review\n_(initializing...)_"
  const reviewCommentId = await createComment(octokit, baseContext, reviewBody)

  const reviewAnalysis: ReviewAnalysis | undefined = await handleReviewAgent(
    octokit,
    baseContext,
    reviewCommentId,
    reviewBody
  )

  // 3) Post a placeholder "AI Test Generation" comment
  let testBody = "### AI Test Generation\n_(initializing...)_"
  const testCommentId = await createComment(octokit, baseContext, testBody)

  // 4) Build a test context that includes existing tests
  const testContext = await buildTestContext(baseContext)

  // 5) Gating step => decide if we need new tests
  const gating = await gatingStep(
    testContext,
    octokit,
    testCommentId,
    testBody,
    reviewAnalysis
  )
  if (!gating.shouldGenerate) {
    // If gating says we do not need new tests, simply run them
    testBody = gating.testBody
    testBody +=
      "\n\nSkipping test generation as existing tests are sufficient. Running tests..."
    await updateComment(octokit, baseContext, testCommentId, testBody)
  } else {
    // Gating says we do need new tests => call handleTestGeneration
    testBody = gating.testBody
    await handleTestGeneration(
      octokit,
      testContext,
      reviewAnalysis,
      testCommentId,
      testBody
    )
  }

  // 6) Run local tests
  let testResult = runLocalTests()

  // 7) If failing, attempt up to 3 fix iterations
  let iteration = 0
  const maxIterations = 3
  while (testResult.jestFailed && iteration < maxIterations) {
    iteration++
    testBody += `\n\n**Test Fix #${iteration}**\nTests are failing. Attempting a fix...`
    await updateComment(octokit, baseContext, testCommentId, testBody)

    // Attempt to fix the failing tests with AI
    await handleTestFix(
      octokit,
      testContext,
      iteration,
      testResult.output,
      testCommentId,
      testBody
    )

    // Re-run tests
    testResult = runLocalTests()
  }

  // 8) Return success/failure. Also update the comment with the final result.
  if (!testResult.jestFailed) {
    testBody += "\n\n✅ All tests passing after AI generation/fixes!"
    await updateComment(octokit, baseContext, testCommentId, testBody)
    return true
  } else {
    testBody += `\n\n❌ Tests failing after ${maxIterations} fix attempts.`
    await updateComment(octokit, baseContext, testCommentId, testBody)
    return false
  }
}
