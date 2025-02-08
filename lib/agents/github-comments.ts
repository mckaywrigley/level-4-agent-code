/**
 * This module abstracts away creating and updating comments on the PR in GitHub.
 * We keep this as is, because we still want to post PR comments via the Octokit API.
 */

import { PullRequestContext } from "./pr-context"

/**
 * createComment:
 * - Creates a brand new comment on the pull request (under the AI account).
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
