/**
 * This module abstracts away creating and updating comments on the PR in GitHub.
 *
 * It is used by code-review.ts, flow-runner.ts, etc. to post or edit the AI Agent's messages.
 */

import { PullRequestContext } from "./pr-context"

/**
 * createComment:
 * - Creates a brand new comment on the pull request (under the AI account).
 * - Returns the comment ID so we can update it later if needed.
 */
export async function createComment(
  octokit: any,
  context: PullRequestContext,
  body: string
): Promise<number> {
  const { data } = await octokit.issues.createComment({
    owner: context.owner,
    repo: context.repo,
    issue_number: context.pullNumber,
    body
  })
  return data.id
}

/**
 * updateComment:
 * - Replaces the body of an existing comment with new content.
 * - We pass the comment's ID, then provide the updated text in "body".
 */
export async function updateComment(
  octokit: any,
  context: PullRequestContext,
  commentId: number,
  body: string
) {
  await octokit.issues.updateComment({
    owner: context.owner,
    repo: context.repo,
    comment_id: commentId,
    body
  })
}
