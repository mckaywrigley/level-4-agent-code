/**
 * This file defines functions and interfaces to build a "PullRequestContext" object,
 * which encapsulates the relevant data about a PR (title, changed files, commit messages).
 *
 * - buildPRContext: Gathers the main info about the pull request and files changed.
 * - buildTestContext: Extends that context by also fetching existing tests.
 */

import { Octokit } from "@octokit/rest"
import { Buffer } from "buffer"

/**
 * The main shape of a pull request context used by other modules.
 * - changedFiles array includes patch diffs, potential file content, etc.
 * - commitMessages is an array of the commit messages from the PR.
 */
export interface PullRequestContext {
  owner: string
  repo: string
  pullNumber: number
  headRef: string
  baseRef: string
  title: string
  changedFiles: {
    filename: string
    patch: string
    status: string
    additions: number
    deletions: number
    content?: string
    excluded?: boolean
  }[]
  commitMessages: string[]
}

/**
 * This extends PullRequestContext with an additional array for existing test files.
 * Used in test generation logic so the AI can see what tests already exist.
 */
export interface PullRequestContextWithTests extends PullRequestContext {
  existingTestFiles: {
    filename: string
    content: string
  }[]
}

/**
 * buildPRContext:
 * - Retrieves PR info from GitHub (title, head/base branches).
 * - Lists changed files and collects their patch data and file content (if not too large).
 * - Also obtains the commit messages for the PR.
 */
export async function buildPRContext(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // Get main PR metadata
  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  })

  // Get file changes in the PR
  const filesRes = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber
  })

  // Get commits in the PR
  const commitsRes = await octokit.pulls.listCommits({
    owner,
    repo,
    pull_number: pullNumber
  })

  const changedFiles = []
  for (const file of filesRes.data) {
    const fileObj = {
      filename: file.filename,
      patch: file.patch ?? "",
      status: file.status || "",
      additions: file.additions || 0,
      deletions: file.deletions || 0,
      content: undefined as string | undefined,
      excluded: false
    }

    // If file is not removed and not in the exclude patterns, fetch content
    if (file.status !== "removed" && !shouldExcludeFile(file.filename)) {
      const content = await getFileContent(
        octokit,
        owner,
        repo,
        file.filename,
        pr.head.ref
      )
      // If the file content is large, we skip storing it to avoid blowing up prompt
      if (content && content.length <= 32000) {
        fileObj.content = content
      } else {
        fileObj.excluded = true
      }
    } else {
      fileObj.excluded = true
    }

    changedFiles.push(fileObj)
  }

  // Convert commit data to an array of messages
  const commitMessages = commitsRes.data.map(c => c.commit.message)

  return {
    owner,
    repo,
    pullNumber,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    title: pr.title || "",
    changedFiles,
    commitMessages
  }
}

/**
 * buildTestContext:
 * - Extends the context built by buildPRContext, but also fetches existing test files from the repository.
 * - This ensures our test generation logic knows about existing tests.
 */
export async function buildTestContext(
  octokit: Octokit,
  context: PullRequestContext
): Promise<PullRequestContextWithTests> {
  const existingTestFiles = await getAllTestFiles(
    octokit,
    context.owner,
    context.repo,
    context.headRef
  )
  return { ...context, existingTestFiles }
}

/**
 * Certain files (like package-lock.json) are typically not relevant for our prompt, so we exclude them.
 */
function shouldExcludeFile(filename: string): boolean {
  const EXCLUDE_PATTERNS = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]
  return EXCLUDE_PATTERNS.some(pattern => filename.endsWith(pattern))
}

/**
 * getFileContent:
 * - Given a path and branch ref, fetches the file from GitHub as base64,
 *   then decodes it into a string.
 */
async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
) {
  try {
    const res = await octokit.repos.getContent({ owner, repo, path, ref })
    if ("content" in res.data && typeof res.data.content === "string") {
      return Buffer.from(res.data.content, "base64").toString("utf8")
    }
    return undefined
  } catch (err: any) {
    // If the file doesn't exist, we simply return undefined
    if (err.status === 404) {
      return undefined
    }
    throw err
  }
}

/**
 * getAllTestFiles:
 * - Recursively searches for files under a given directory (default __tests__/),
 *   fetching content for each file found.
 * - This is used to collect all existing test files so the AI can reference them.
 */
async function getAllTestFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  ref: string,
  dirPath = "__tests__"
): Promise<{ filename: string; content: string }[]> {
  const results: { filename: string; content: string }[] = []
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: dirPath,
      ref
    })
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.type === "file") {
          // If it's a file, get its content
          const c = await getFileContent(octokit, owner, repo, item.path, ref)
          if (c) {
            results.push({ filename: item.path, content: c })
          }
        } else if (item.type === "dir") {
          // If it's a directory, recurse
          const sub = await getAllTestFiles(
            octokit,
            owner,
            repo,
            ref,
            item.path
          )
          results.push(...sub)
        }
      }
    }
  } catch (err: any) {
    // If the directory doesn't exist, we do nothing
    if (err.status !== 404) throw err
  }
  return results
}
