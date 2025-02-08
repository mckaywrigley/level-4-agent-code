/*
<ai_context>
Provides a function to run the "AI code review → test gating → test generation
→ iterative test fix" logic on a specified PR number. We do NOT fetch file content
from GitHub. Instead, we rely on local buildPRContext that uses local diffs.
</ai_context>
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
 * - We pass in (octokit, owner, repo, pullNumber).
 * - It executes "review → gating → test generation → fix" logic
 *   on the local code as it stands, using buildPRContext (local diff).
 * - Returns true if tests eventually pass, false otherwise.
 */
export async function runFlowOnPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  // 1) Build local PR context
  const baseContext = await buildPRContext(owner, repo, pullNumber)

  // 2) Post a placeholder "AI Code Review" comment
  let reviewBody = "### AI Code Review\n_(initializing...)_"
  const reviewCommentId = await createComment(octokit, baseContext, reviewBody)

  // 3) Code review
  const reviewAnalysis: ReviewAnalysis | undefined = await handleReviewAgent(
    octokit,
    baseContext,
    reviewCommentId,
    reviewBody
  )

  // 4) Post a placeholder "AI Test Generation" comment
  let testBody = "### AI Test Generation\n_(initializing...)_"
  const testCommentId = await createComment(octokit, baseContext, testBody)

  // 5) Build a test context from local tests
  const testContext = await buildTestContext(baseContext)

  // 6) Gating step
  const gating = await gatingStep(
    testContext,
    octokit,
    testCommentId,
    testBody,
    reviewAnalysis
  )
  if (!gating.shouldGenerate) {
    testBody = gating.testBody
    testBody +=
      "\n\nSkipping test generation as existing tests are sufficient. Running tests..."
    await updateComment(octokit, baseContext, testCommentId, testBody)
  } else {
    testBody = gating.testBody
    await handleTestGeneration(
      octokit,
      testContext,
      reviewAnalysis,
      testCommentId,
      testBody
    )
  }

  // 7) Run local tests
  let testResult = runLocalTests()

  // 8) If failing, do iterative fix attempts
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

    testResult = runLocalTests()
  }

  // 9) Return success/failure
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
