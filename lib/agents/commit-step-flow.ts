/**
 * commit-step-flow.ts
 *
 * Focuses on the latest commit only, after each step, to do a *partial* AI flow.
 *
 * In this updated version, we only do an AI code review for the latest commit.
 * We skip test gating, test generation, and iterative test fixes at each step.
 *
 * Instead, the full test/fix cycle happens at the end (see runFlowOnPR).
 */

import { Octokit } from "@octokit/rest"
import { handleReviewAgent } from "./code-review"
import { createComment } from "./github-comments"
import { compareCommitsForPR } from "./partial-pr-context"

/**
 * runFlowOnLatestCommit:
 * - Compares HEAD~1..HEAD locally to get only this new commit's changes.
 * - Posts an "AI Code Review" comment on the PR for these partial changes.
 * - *Skips* test gating, generation, and fixes here.
 * - Returns true (we don't fail partial steps on tests).
 */
export async function runFlowOnLatestCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  // 1) Compare HEAD~1..HEAD to get partial context (latest commit only).
  const partialContext = await compareCommitsForPR(owner, repo, pullNumber)

  // 2) Post a placeholder "AI Code Review" comment for this commit.
  let reviewBody = "### AI Code Review (Latest Commit)\n_(initializing...)_"
  const reviewCommentId = await createComment(
    octokit,
    partialContext,
    reviewBody
  )

  // 3) Perform code review on just the new changes
  await handleReviewAgent(octokit, partialContext, reviewCommentId, reviewBody)

  // 4) Always return true (we no longer run tests here).
  return true
}
