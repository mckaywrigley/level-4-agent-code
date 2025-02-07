/*
<ai_context>
Builds a "partial" PR context focusing only on the latest commit's changes,
using the Compare Commits API. The returned object has the same shape as a
PullRequestContext (owner, repo, changedFiles, etc.) so we can reuse the same
review/test logic, but it's only for the last commit's changes.
</ai_context>
*/

import { Octokit } from "@octokit/rest"
import { PullRequestContext } from "./pr-context"

export async function compareCommitsForPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // 1) Get PR data so we know the head ref, title, etc.
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })

  // 2) List commits in the PR
  const commitsRes = await octokit.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber
  })
  const allCommits = commitsRes.data
  if (allCommits.length === 0) {
    throw new Error(
      `No commits in PR #${pullNumber} - cannot do partial compare.`
    )
  }

  // The last commit in the array is HEAD
  const headCommitSha = allCommits[allCommits.length - 1].sha

  // The commit's parent (assuming a single parent) is the base for compare
  const parents = allCommits[allCommits.length - 1].parents
  if (!parents || parents.length === 0) {
    throw new Error(`HEAD commit has no parent. Possibly a single-commit PR?`)
  }
  const parentSha = parents[0].sha

  // 3) Compare the parent to the head (latest commit only)
  const compare = await octokit.repos.compareCommits({
    owner,
    repo,
    base: parentSha,
    head: headCommitSha
  })

  // Build a partial "changedFiles" array
  const changedFiles = []
  if (compare.data.files) {
    for (const f of compare.data.files) {
      // We only care about the patch for the single commit
      const fileObj = {
        filename: f.filename,
        patch: f.patch ?? "",
        status: f.status || "",
        additions: f.additions ?? 0,
        deletions: f.deletions ?? 0,
        content: undefined as string | undefined,
        excluded: false
      }
      changedFiles.push(fileObj)
    }
  }

  // We do not fetch full file content for partial context
  // If you want to fetch it, you can do so similarly to buildPRContext.
  // For brevity, let's skip that.

  // Also gather commit messages from just this single commit
  const commitMessages = [allCommits[allCommits.length - 1].commit.message]

  // 4) Return a "PullRequestContext" shaped object, except it only has partial info
  const partialContext: PullRequestContext = {
    owner,
    repo,
    pullNumber,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    title: `Latest commit partial: ${pr.title}`,
    changedFiles,
    commitMessages
  }

  return partialContext
}
