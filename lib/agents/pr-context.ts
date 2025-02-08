/**
 * pr-context.ts
 * --------------------------------------------------------------------
 * This file defines functions and interfaces to build a "PullRequestContext"
 * object. That context includes:
 *   - Owner, repo, PR number
 *   - Title
 *   - Array of changed files (with patch diffs, etc.)
 *   - Array of commit messages
 *
 * For the final pass, we want the entire set of changes from the base branch
 * (usually `main`) to HEAD of the feature branch. That context is used by:
 *   - Code review
 *   - Test gating
 *   - Test generation
 *
 * In this local-based approach, we rely on local Git commands (e.g., `git diff`)
 * rather than using GitHub's remote REST calls.
 * --------------------------------------------------------------------
 */

import { execSync } from "child_process"
import fs from "fs"
import path from "path"

/**
 * The main shape used throughout the code for referencing the PR context.
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
 * An extended shape that also includes existing test files
 * for test generation or updating.
 */
export interface PullRequestContextWithTests extends PullRequestContext {
  existingTestFiles: {
    filename: string
    content: string
  }[]
}

/**
 * buildPRContext:
 * ------------------------------------------------------------------
 * Builds a PullRequestContext by:
 *   1) Finding the local merge-base with `main`.
 *   2) Doing a `git diff` from that merge-base to HEAD to collect patches.
 *   3) Grabbing all commit messages from that range as well.
 *
 * This yields an overview of all changes in the feature branch.
 */
export async function buildPRContext(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestContext> {
  // Attempt to find the merge-base of HEAD and main
  let mergeBase = "HEAD"
  try {
    mergeBase = execSync(`git merge-base HEAD main`, {
      encoding: "utf8"
    }).trim()
  } catch (err) {
    // fallback if main doesn't exist or some error
  }

  // Gather the patch from mergeBase..HEAD
  let patchOutput = ""
  try {
    patchOutput = execSync(`git diff ${mergeBase} HEAD --unified=99999`, {
      encoding: "utf8"
    })
  } catch (err) {
    patchOutput = "No patch found. Possibly no changes from main."
  }

  // Parse changed files
  const changedFiles = parseFullDiffToChangedFiles(patchOutput)

  // Gather commit messages from mergeBase..HEAD
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
 * ------------------------------------------------------------------
 * Similar to partial parse logic, but for the entire range from base to HEAD.
 * We store the entire patch in .patch.
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
 * ------------------------------------------------------------------
 * Extends the base PR context by scanning the local `__tests__/unit`
 * folder for existing tests. We read them from disk so the AI can
 * see what's already tested and avoid duplicating them or can
 * update them if needed.
 */
export async function buildTestContext(
  context: PullRequestContext
): Promise<PullRequestContextWithTests> {
  const testFiles = readLocalTestFiles("__tests__/unit")
  return { ...context, existingTestFiles: testFiles }
}

/**
 * Recursively read all test files in `__tests__/unit`, storing
 * their filenames and contents for the AI to reference.
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
      // Consider it a test file if it ends in .test.ts or .test.tsx
      if (
        currentPath.endsWith(".test.ts") ||
        currentPath.endsWith(".test.tsx")
      ) {
        const content = fs.readFileSync(currentPath, "utf8")
        const relPath = path.relative(process.cwd(), currentPath)
        results.push({ filename: relPath, content })
      }
    }
  }

  recurse(path.join(process.cwd(), dirPath))
  return results
}
