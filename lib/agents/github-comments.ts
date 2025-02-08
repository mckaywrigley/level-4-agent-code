/**
 * github-comments.ts
 * --------------------------------------------------------------------
 * This module abstracts away creating and updating comments on GitHub PRs
 * using the Octokit API.
 *
 * Main exports:
 *  - createComment(...) => Creates a brand new comment on a pull request.
 *  - updateComment(...) => Edits an existing comment to replace its entire body.
 *
 * Because we often need to repeatedly post or update the "AI code review"
 * or "AI tests" comment, these helper functions keep the code simpler.
 * --------------------------------------------------------------------
 */

import { PullRequestContext } from "./pr-context"

/**
 * createComment:
 * ------------------------------------------------------------------
 * Creates a brand-new comment on the pull request, under the
 * AI agent's account (the user identity set in the workflow).
 *
 * @param octokit  The Octokit client
 * @param context  The relevant pull request context (owner, repo, pullNumber)
 * @param body     The text to post in the new comment
 * @returns        The numeric comment ID of the newly created comment
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
 * ------------------------------------------------------------------
 * Updates an existing PR comment by replacing the body text
 * with new content.
 *
 * @param octokit     The Octokit client
 * @param context     The relevant pull request context
 * @param commentId   The ID of the comment to update
 * @param body        The new text to replace the old comment body
 * @returns           void
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
