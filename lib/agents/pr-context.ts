/**
 * This file defines functions and interfaces to build a "PullRequestContext" object,
 * which encapsulates the relevant data about a PR (title, changed files, commit messages).
 *
 * We used to call GitHub to fetch file contents, but now we read the local git diff
 * from the base branch to HEAD. We also read local commit messages via git commands.
 */

import { execSync } from "child_process"
import fs from "fs"
import path from "path"

/**
 * The main shape of a pull request context used by other modules.
 * - changedFiles array includes patch diffs, optional file content, etc.
 * - commitMessages is an array of commit messages from HEAD's commits.
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
 */
export interface PullRequestContextWithTests extends PullRequestContext {
  existingTestFiles: {
    filename: string
    content: string
  }[]
}

/**
 * buildPRContext:
 * - Instead of contacting GitHub for file diffs/contents, we:
 *   1) Find the merge base of HEAD and main (or another base).
 *   2) Do git diff to get changes for all commits in this branch.
 *   3) Gather commit messages from the same range.
 */
export async function buildPRContext(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // 1) We assume we have the local feature branch checked out.
  //    We'll find a local merge-base with main, e.g.:
  let mergeBase = "HEAD"
  try {
    mergeBase = execSync(`git merge-base HEAD main`, {
      encoding: "utf8"
    }).trim()
  } catch (err) {
    // fallback
  }

  // 2) Build diff from that merge base to HEAD
  let patchOutput = ""
  try {
    patchOutput = execSync(`git diff ${mergeBase} HEAD --unified=99999`, {
      encoding: "utf8"
    })
  } catch (err) {
    patchOutput = "No patch found. Possibly no changes from main."
  }

  // parse changed files from the patch
  const changedFiles = parseFullDiffToChangedFiles(patchOutput)

  // 3) Gather commit messages from mergeBase..HEAD
  let commitMessages: string[] = []
  try {
    const logs = execSync(`git log --pretty=%B ${mergeBase}..HEAD`, {
      encoding: "utf8"
    })
    commitMessages = logs
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
  } catch (err) {
    commitMessages = []
  }

  return {
    owner,
    repo,
    pullNumber,
    headRef: "unknown-local-head",
    baseRef: "main",
    title: "Local PR Context",
    changedFiles,
    commitMessages
  }
}

/**
 * parseFullDiffToChangedFiles:
 * - Similar to partial logic, but we assume we might want the entire set of diffs.
 * - We store the patch in patch, we skip 'status', etc.
 */
function parseFullDiffToChangedFiles(diffText: string) {
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

/**
 * buildTestContext:
 * - Extends the context by reading test files from the local `__tests__/unit` folder.
 * - We do NOT fetch from GitHub.
 */
export async function buildTestContext(
  context: PullRequestContext
): Promise<PullRequestContextWithTests> {
  const testFiles = readLocalTestFiles("__tests__/unit")
  return { ...context, existingTestFiles: testFiles }
}

/**
 * Recursively scan the local `__tests__/unit` folder to read test files.
 */
function readLocalTestFiles(
  dirPath: string
): { filename: string; content: string }[] {
  const results: { filename: string; content: string }[] = []

  function recurse(currentPath: string) {
    if (!fs.existsSync(currentPath)) return

    const stat = fs.statSync(currentPath)
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(currentPath)
      for (const entry of entries) {
        recurse(path.join(currentPath, entry))
      }
    } else {
      // If it's a file, read content if it ends with .test.ts or .test.tsx
      if (
        currentPath.endsWith(".test.ts") ||
        currentPath.endsWith(".test.tsx")
      ) {
        const content = fs.readFileSync(currentPath, "utf8")
        // Make the path relative so it can match or differ
        const relPath = path.relative(process.cwd(), currentPath)
        results.push({ filename: relPath, content })
      }
    }
  }

  recurse(path.join(process.cwd(), dirPath))
  return results
}
