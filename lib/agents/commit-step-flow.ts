/*
<ai_context>
Focuses on the latest commit only, after each step, to do code review/test generation/fix
(based on partial local diffs). We used to fetch partial diffs from GitHub, but now
we rely on local 'compareCommitsForPR'.
</ai_context>
*/

import { Octokit } from "@octokit/rest"
import { handleReviewAgent, ReviewAnalysis } from "./code-review"
import { createComment, updateComment } from "./github-comments"
import { compareCommitsForPR } from "./partial-pr-context"
import { buildTestContext } from "./pr-context"
import { handleTestFix } from "./test-fix"
import { gatingStep } from "./test-gating"
import { handleTestGeneration } from "./test-proposals"
import { runLocalTests } from "./test-runner"

export async function runFlowOnLatestCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  // 1) Compare HEAD~1..HEAD locally
  const partialContext = await compareCommitsForPR(owner, repo, pullNumber)

  // 2) Build a partial test context by scanning local tests
  const partialTestContext = await buildTestContext(partialContext)

  // 3) Post a placeholder "AI Code Review" comment
  let reviewBody = "### AI Code Review (Latest Commit)\n_(initializing...)_"
  const reviewCommentId = await createComment(
    octokit,
    partialTestContext,
    reviewBody
  )

  // 4) Perform code review on just the new changes
  const reviewAnalysis: ReviewAnalysis | undefined = await handleReviewAgent(
    octokit,
    partialTestContext,
    reviewCommentId,
    reviewBody
  )

  // 5) Post a placeholder "AI Test Generation" comment
  let testBody = "### AI Test Generation (Latest Commit)\n_(initializing...)_"
  const testCommentId = await createComment(
    octokit,
    partialTestContext,
    testBody
  )

  // 6) Gating step
  const gating = await gatingStep(
    partialTestContext,
    octokit,
    testCommentId,
    testBody,
    reviewAnalysis
  )
  if (!gating.shouldGenerate) {
    testBody = gating.testBody
    testBody +=
      "\n\nSkipping test generation for this latest commit. Running tests..."
    await updateComment(octokit, partialTestContext, testCommentId, testBody)
  } else {
    testBody = gating.testBody
    await handleTestGeneration(
      octokit,
      partialTestContext,
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
    testBody += `\n\n**Test Fix #${iteration}**\nLatest commit tests failing. Attempting a fix...`
    await updateComment(octokit, partialTestContext, testCommentId, testBody)

    await handleTestFix(
      octokit,
      partialTestContext,
      iteration,
      testResult.output,
      testCommentId,
      testBody
    )

    testResult = runLocalTests()
  }

  // 9) Return success/failure
  if (!testResult.jestFailed) {
    testBody +=
      "\n\n✅ Tests passing (latest commit) after AI generation/fixes!"
    await updateComment(octokit, partialTestContext, testCommentId, testBody)
    return true
  } else {
    testBody += `\n\n❌ Tests failing on latest commit after ${maxIterations} fix attempts.`
    await updateComment(octokit, partialTestContext, testCommentId, testBody)
    return false
  }
}
