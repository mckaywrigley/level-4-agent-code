/*
partial-pr-context.ts
----------------------------------------------------------------------
This module builds a "partial" PR context focusing only on the latest 
commit's changes. It uses local Git commands to get a diff from 
HEAD~1..HEAD, rather than pulling data from the GitHub API.

Used typically for partial code reviews after each commit (i.e. 
incremental updates).
----------------------------------------------------------------------
*/

import { execSync } from "child_process"
import { PullRequestContext } from "./pr-context"

/**
 * compareCommitsForPR:
 * ------------------------------------------------------------------
 * Instead of calling GitHub's "compare commits" API, we do a local
 * `git diff HEAD~1 HEAD` to gather only the last commit's patch.
 * Then we create a partial PullRequestContext with that patch data.
 *
 * This approach is crucial if the code is already checked out
 * in the CI environment.
 *
 * @param owner       The GitHub repo owner
 * @param repo        The GitHub repo name
 * @param pullNumber  The PR number
 * @returns           A partial PullRequestContext containing only the new changes
 */
export async function compareCommitsForPR(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // 1) Grab the last commit message for context
  let lastCommitMessage = "Unknown commit message"
  try {
    lastCommitMessage = execSync(`git log -1 --pretty=%B`, {
      encoding: "utf8"
    }).trim()
  } catch (e) {
    // fallback
  }

  // 2) Gather the patch from HEAD~1..HEAD
  let patchOutput = ""
  try {
    patchOutput = execSync(`git diff HEAD~1 HEAD --unified=99999`, {
      encoding: "utf8"
    })
  } catch (err) {
    // If there's only one commit, HEAD~1 might fail. We'll set patchOutput to some fallback.
    patchOutput = "No patch found (possibly first commit?)"
  }

  // 3) Parse that patch into changedFiles
  const changedFiles = parseDiffToChangedFiles(patchOutput)

  // 4) Build a partial PullRequestContext
  const partialContext: PullRequestContext = {
    owner,
    repo,
    pullNumber,
    headRef: `unknown`,
    baseRef: `unknown`,
    title: `Latest commit partial: (Local Diff)`,
    changedFiles,
    commitMessages: [lastCommitMessage]
  }

  return partialContext
}

/**
 * parseDiffToChangedFiles:
 * ------------------------------------------------------------------
 * Splits the raw diff text into per-file patches. We store
 * everything in .patch. For more detailed logic (e.g. additions,
 * deletions), you'd parse each chunk further.
 *
 * @param diffText  The raw output from `git diff`
 * @returns         An array of changed file objects
 */
function parseDiffToChangedFiles(diffText: string) {
  // The naive approach: split on "diff --git "
  const segments = diffText.split("diff --git ")
  const results = []
  for (const seg of segments) {
    if (!seg.trim()) continue
    const lines = seg.split("\n")
    const firstLine = lines[0] || ""
    const patch = "diff --git " + seg
    const match = /a\/(\S+)\s+b\/(\S+)/.exec(firstLine)
    const filename = match ? match[2] : "unknown.file"

    results.push({
      filename,
      patch,
      status: "",
      additions: 0,
      deletions: 0,
      content: undefined,
      excluded: false
    })
  }
  return results
}
