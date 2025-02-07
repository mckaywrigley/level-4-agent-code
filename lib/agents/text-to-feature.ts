/*
<ai_context>
Extended with a new helper "ensurePullRequest" that either finds or creates
a PR from branch -> main. This is so each commit can run the "review/test"
logic on that open PR.

Now also updated to:
1) Gather full codebase context for the text-to-feature step (so the LLM sees the entire code).
2) Rebase/pull if the feature branch already exists, avoiding push rejections.
3) Maintain doc comments as requested.

Changes:
- Added 'gatherFullCodebaseContextForFeature' to replicate the logic from the planner.
- Updated 'getFileChangesForStep' to include full codebase context in the prompt.
- Modified 'switchToFeatureBranch' to pull/rebase if branch already exists.
</ai_context>
*/

import { FileChange } from "@/types/file-types"
import { Step } from "@/types/step-types"
import { Octokit } from "@octokit/rest"
import { generateObject } from "ai"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

/**
 * changesSchema:
 * - We expect an object with a single key "changedFiles"
 * - "changedFiles" is an array of objects, each with "file" and "content".
 * - "file" is the path to the file (e.g. "app/page.tsx")
 * - "content" is the full new content for that file.
 */
const changesSchema = z.object({
  changedFiles: z.array(
    z.object({
      file: z.string(),
      content: z.string()
    })
  )
})

/**
 * getFileChangesForStep:
 * - Calls our LLM with a prompt describing the single step to implement.
 * - Now also includes the entire codebase context (similar to planner).
 * - The LLM returns a JSON array of file changes that need to be applied.
 */
export async function getFileChangesForStep(
  step: Step,
  accumulatedChanges: FileChange[]
): Promise<FileChange[]> {
  const model = getLLMModel()

  // We'll include prior changes in case the LLM needs to see them
  const priorChangesSnippet = accumulatedChanges
    .map(c => `File: ${c.file}\n---\n${c.content}`)
    .join("\n\n")

  // Gather the entire codebase (like the planner does), minus large or excluded files
  const codebaseListing = gatherFullCodebaseContextForFeature(process.cwd())

  const prompt = `
You are an AI coding assistant. You have two contexts:

1) The entire current codebase (excluding huge/unnecessary files):
${codebaseListing}

2) A list of prior changes that have been made in earlier steps of this feature:
${priorChangesSnippet}

Now we have a new step to implement:
Name: ${step.stepName}
Description: ${step.stepDescription}
Plan: ${step.stepPlan}

Return JSON only, matching this structure:
{
  "changedFiles": [
    {"file":"path/to/file.ts","content":"(updated file content)"}
  ]
}
`

  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`File changes prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  try {
    const result = await generateObject({
      model,
      schema: changesSchema,
      schemaName: "changes",
      schemaDescription: "An array of file changes",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(
      `File changes result:\n${JSON.stringify(result.object, null, 2)}`
    )
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object.changedFiles
  } catch (error: any) {
    console.error("Error in getFileChangesForStep:", error)
    return []
  }
}

/**
 * applyFileChanges:
 * - Writes each { file, content } to disk, creating dirs as necessary.
 */
export function applyFileChanges(changes: FileChange[]) {
  for (const change of changes) {
    const target = path.join(process.cwd(), change.file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, change.content, "utf-8")
  }
}

/**
 * switchToFeatureBranch:
 * - Checks out main, pulls latest, then creates or switches to branchName.
 * - If the branch already exists locally, we also pull/rebase from the remote
 *   to avoid push rejections (like "Updates were rejected because the remote contains work...").
 */
export function switchToFeatureBranch(branchName: string) {
  try {
    execSync(`git checkout main`, { stdio: "inherit" })
  } catch {
    // ignore
  }
  try {
    execSync(`git pull origin main`, { stdio: "inherit" })
  } catch {
    // ignore
  }
  try {
    // Create a new branch
    execSync(`git checkout -b ${branchName}`, { stdio: "inherit" })
  } catch {
    // If creation fails, we assume branch already exists:
    execSync(`git checkout ${branchName}`, { stdio: "inherit" })
    // Attempt to pull/rebase from remote to avoid push conflicts
    try {
      execSync(`git pull origin ${branchName} --rebase`, { stdio: "inherit" })
    } catch {
      // ignore
    }
  }
}

/**
 * commitChanges:
 * - Adds, commits with a message, pushes to origin HEAD.
 */
export function commitChanges(message: string) {
  execSync(`git add .`, { stdio: "inherit" })
  execSync(`git commit -m "${message}"`, { stdio: "inherit" })
  execSync(`git push origin HEAD`, { stdio: "inherit" })
}

/**
 * ensurePullRequest:
 * - Checks if there's already a PR from "branchName" to main.
 * - If none, creates a new PR with a basic title/body.
 * - Returns the PR number (we need that to post code review & test generation comments).
 */
export async function ensurePullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  featureRequest: string
): Promise<number> {
  // 1) See if a PR from this branch → main is already open
  const existing = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "open"
  })
  if (existing.data.length > 0) {
    // If we found an open PR from the same branch, just return its number
    return existing.data[0].number
  }

  // 2) Create a new PR
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head: branchName,
    base: "main",
    title: `Agent: ${featureRequest}`,
    body: `This is an AI-generated PR for feature: "${featureRequest}".`
  })

  return pr.number
}

/**
 * gatherFullCodebaseContextForFeature:
 * - Recursively scans the local filesystem starting from `baseDir`.
 * - Excludes large or irrelevant files to keep prompt size manageable.
 * - Returns a single string that lists all included files with contents.
 *
 * Note: This is nearly identical to the gather logic in planner.ts,
 * but we replicate it here for the "text-to-feature" steps to ensure
 * the LLM can see the broader codebase when implementing each step.
 */
function gatherFullCodebaseContextForFeature(baseDir: string): string {
  const excludeDirs = [
    ".git",
    "node_modules",
    ".next",
    "dist",
    "build",
    ".vercel"
  ]
  const excludeFiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"]

  let output: string[] = []

  function recurse(currentPath: string) {
    const stat = fs.statSync(currentPath)
    if (stat.isDirectory()) {
      const dirName = path.basename(currentPath)
      if (excludeDirs.includes(dirName)) {
        return // skip this entire directory
      }

      // read contents
      const entries = fs.readdirSync(currentPath)
      for (const entry of entries) {
        recurse(path.join(currentPath, entry))
      }
    } else {
      // it's a file
      const fileName = path.basename(currentPath)
      if (excludeFiles.includes(fileName)) {
        return // skip lockfiles, etc.
      }

      // read content
      let content = fs.readFileSync(currentPath, "utf-8")

      // check character length limit
      if (content.length > 20000) {
        return // skip large files
      }

      // build snippet: "File: path/from/cwd\n---\n(content)"
      // We'll make the path relative to the baseDir so it's more readable
      const relPath = path.relative(baseDir, currentPath)

      const snippet = `File: ${relPath}\n---\n${content}`
      output.push(snippet)
    }
  }

  recurse(baseDir)

  // Join them with blank lines
  return output.join("\n\n")
}
