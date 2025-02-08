/**
 * commit-step-flow.ts
 * --------------------------------------------------------------------
 * This file focuses on reviewing the "latest commit" only after each step.
 * In other words, after each small chunk of changes is committed, we do
 * a partial code review. We skip the test generation/fix in this partial
 * flow (or you can easily integrate it if desired).
 *
 * The idea is that each step's incremental changes get a quick code review
 * from the AI, but the final test suite run and fix logic are done once
 * at the end in a separate process (see `pr-step-flow.ts`).
 * --------------------------------------------------------------------
 */

import { Octokit } from "@octokit/rest"
import { handleReviewAgent } from "./code-review"
import { createComment } from "./github-comments"
import { compareCommitsForPR } from "./partial-pr-context"

/**
 * runFlowOnLatestCommit:
 * ------------------------------------------------------------------
 * 1) Compares HEAD~1..HEAD to get only the new commit's changes
 *    (the partial context).
 * 2) Posts an "AI Code Review" comment on the PR for these partial changes.
 * 3) Uses the code review agent to analyze the new changes.
 * 4) Currently, it always returns true (we skip test gating at this partial stage).
 *
 * This function is typically called after each step's commit to
 * keep track of incremental code review feedback.
 *
 * @param octokit     The Octokit client instance
 * @param owner       The repository owner
 * @param repo        The repository name
 * @param pullNumber  The pull request number
 * @returns           A boolean indicating success (always true, but could be extended)
 */
export async function runFlowOnLatestCommit(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<boolean> {
  // 1) Compare HEAD~1..HEAD to get partial context for the new commit only.
  const partialContext = await compareCommitsForPR(owner, repo, pullNumber)

  // 2) Post a placeholder comment on the PR indicating the code review is about to happen.
  let reviewBody = "### AI Code Review (Latest Commit)\n_(initializing...)_"
  const reviewCommentId = await createComment(
    octokit,
    partialContext,
    reviewBody
  )

  // 3) Perform code review on just the new changes
  await handleReviewAgent(octokit, partialContext, reviewCommentId, reviewBody)

  // 4) Return true. We skip test gating in partial reviews by design.
  return true
}
