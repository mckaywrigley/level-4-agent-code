/*
<ai_context>
Builds a "partial" PR context focusing only on the latest commit's changes,
using local git commands instead of the Compare Commits API. The returned
object has the same shape as a PullRequestContext, but we rely on local
filesystem and git patch data.

We do NOT fetch from GitHub. Instead, we do "git diff HEAD~1 HEAD".
</ai_context>
*/

import { execSync } from "child_process"
import { PullRequestContext } from "./pr-context"

/**
 * compareCommitsForPR:
 * - NO LONGER calls GitHub APIs for diff data. Instead, we do a local:
 *     git diff HEAD~1 HEAD --unified=99999
 * - Returns a partial "PullRequestContext" shaped object, but only focusing
 *   on the last commit's changes.
 */
export async function compareCommitsForPR(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // 1) We assume we are already on the correct feature branch locally.
  // 2) Grab the last commit message so we can store it in commitMessages array.
  let lastCommitMessage = "Unknown commit message"
  try {
    lastCommitMessage = execSync(`git log -1 --pretty=%B`, {
      encoding: "utf8"
    }).trim()
  } catch (e) {
    // fallback
  }

  // 3) Gather the patch from HEAD~1..HEAD
  let patchOutput = ""
  try {
    patchOutput = execSync(`git diff HEAD~1 HEAD --unified=99999`, {
      encoding: "utf8"
    })
  } catch (err) {
    // If there's only one commit, HEAD~1 might fail. We'll set patchOutput = entire HEAD
    patchOutput = "No patch found (possibly first commit?)"
  }

  // 4) Parse the patch into changedFiles array
  //    For simplicity, we store the entire patch as .patch. We do NOT fetch content from remote.
  //    If you want, you can parse the patch to get additions/deletions, etc.
  const changedFiles = parseDiffToChangedFiles(patchOutput)

  // 5) Return a partial "PullRequestContext"
  const partialContext: PullRequestContext = {
    owner,
    repo,
    pullNumber,
    headRef: `unknown`, // We skip for partial context
    baseRef: `unknown`,
    title: `Latest commit partial: (Local Diff)`,
    changedFiles,
    commitMessages: [lastCommitMessage]
  }

  return partialContext
}

/**
 * parseDiffToChangedFiles:
 * Takes the raw diff from `git diff` and splits into file-based patches.
 * Minimally, we store patch text. We do not fetch full file content.
 */
function parseDiffToChangedFiles(diffText: string) {
  // naive approach: split on "diff --git "
  const segments = diffText.split("diff --git ")
  const results = []
  for (const seg of segments) {
    if (!seg.trim()) continue
    // typically starts like: a/path b/path ...
    const lines = seg.split("\n")
    const firstLine = lines[0] || ""
    // parse out filenames if you want
    // for now we'll store patch = entire segment
    const patch = "diff --git " + seg

    // naive parse for filename from line
    const match = /a\/(\S+)\s+b\/(\S+)/.exec(firstLine)
    const filename = match ? match[2] : "unknown.file"

    results.push({
      filename,
      patch,
      status: "", // we skip for partial
      additions: 0,
      deletions: 0,
      content: undefined,
      excluded: false
    })
  }

  return results
}
