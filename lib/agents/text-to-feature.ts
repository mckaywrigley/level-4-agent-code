/*
text-to-feature.ts
----------------------------------------------------------------------
Focuses on reading/writing local files for each step in the plan. 
We call an LLM to propose code changes. We then commit those changes 
to our local branch and push to GitHub. 
It also handles ensuring a pull request is open for our feature branch.

Main Exports:
 - getFileChangesForStep(...)
 - applyFileChanges(...)
 - switchToFeatureBranch(...)
 - commitChanges(...)
 - ensurePullRequest(...)
----------------------------------------------------------------------
*/

import { codeRules } from "@/constants/code-rules"
import { FileChange } from "@/types/file-types"
import { Step } from "@/types/step-types"
import { Octokit } from "@octokit/rest"
import { generateObject } from "ai"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

// Zod schema describing the shape of the LLM's file change output
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
 * ------------------------------------------------------------------
 * 1) Builds a prompt describing the single step to implement.
 * 2) Sends the entire codebase as context, plus any "accumulated changes"
 *    from previous steps, so the LLM knows what's changed so far.
 * 3) Returns a list of file modifications or new files as JSON.
 */
export async function getFileChangesForStep(
  step: Step,
  accumulatedChanges: FileChange[]
): Promise<FileChange[]> {
  const model = getLLMModel()

  // Convert prior changes into a snippet so the model sees them.
  const priorChangesSnippet = accumulatedChanges
    .map(c => `File: ${c.file}\n---\n${c.content}`)
    .join("\n\n")

  // Gather the entire codebase (truncated as necessary)
  const codebaseListing = gatherFullCodebaseContextForFeature(process.cwd())

  // The prompt instructs the LLM to "only write frontend code" and how to format JSON.
  const prompt = `
You are a frontend AI coding assistant. You *only* write frontend code. 
Another AI might handle other parts. 

Entire codebase context (some large files truncated):
<codebase-listing>
${codebaseListing}
</codebase-listing>

So far, the user request has caused some prior changes:
<prior-changes>
${priorChangesSnippet}
</prior-changes>

Here are the code rules:
<code-rules>
${codeRules}
</code-rules>

Now implement the next step:
Name: ${step.stepName}
Description: ${step.stepDescription}
Plan: ${step.stepPlan}

Return JSON only, with structure:
{
  "changedFiles": [
    {"file":"path/to/file.ts","content":"(updated file content)"}
  ]
}
`

  console.log(
    `\n--- getFileChangesForStep Prompt ---\n${prompt.replace(codebaseListing, "[codebase listing omitted]").replace(codeRules, "[code rules omitted]")}\n---`
  )

  try {
    const result = await generateObject({
      model,
      schema: changesSchema,
      schemaName: "changes",
      schemaDescription: "Array of file changes to apply",
      prompt,
      providerOptions: {
        openai: {
          reasoningEffort: "high"
        }
      }
    })

    console.log(
      `\n--- getFileChangesForStep Result ---\n${JSON.stringify(result.object, null, 2)}\n---`
    )
    return result.object.changedFiles
  } catch (error) {
    console.error("Error in getFileChangesForStep:", error)
    return []
  }
}

/**
 * applyFileChanges:
 * ------------------------------------------------------------------
 * For each file specified, we write the new content to disk. If the
 * directories do not exist, we create them recursively.
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
 * ------------------------------------------------------------------
 * 1) Check out main, pull latest.
 * 2) Check if feature branch exists remotely:
 *    - If yes, check it out and rebase.
 *    - If no, create it from main.
 * This ensures we're working on an up-to-date feature branch.
 */
export function switchToFeatureBranch(branchName: string) {
  try {
    execSync(`git checkout main`, { stdio: "inherit" })
    execSync(`git pull origin main`, { stdio: "inherit" })

    // Check if remote branch exists
    execSync(`git fetch origin`, { stdio: "inherit" })
    const remoteBranches = execSync(`git branch -r`, { encoding: "utf-8" })
    const branchExistsRemotely = remoteBranches
      .split("\n")
      .some(line => line.trim() === `origin/${branchName}`)

    if (branchExistsRemotely) {
      // If it exists, try to check it out locally
      try {
        execSync(`git checkout ${branchName}`, { stdio: "inherit" })
      } catch {
        execSync(`git checkout -b ${branchName} origin/${branchName}`, {
          stdio: "inherit"
        })
      }
      // Then rebase with the remote
      execSync(`git pull origin ${branchName} --rebase`, { stdio: "inherit" })
    } else {
      // Otherwise, create a new local branch from main
      execSync(`git checkout -b ${branchName}`, { stdio: "inherit" })
    }
  } catch (err) {
    console.error("Error in switchToFeatureBranch:", err)
    throw err
  }
}

/**
 * commitChanges:
 * ------------------------------------------------------------------
 * 1) Stage all changes via `git add .`.
 * 2) Commit with the provided message.
 * 3) Push changes to the remote branch. If the branch does not exist
 *    yet on remote, we do `git push -u origin HEAD`.
 * 4) If the branch already exists, we rebase to avoid conflicts,
 *    then push.
 */
export function commitChanges(message: string) {
  try {
    execSync(`git add .`, { stdio: "inherit" })
    execSync(`git commit -m "${message}"`, { stdio: "inherit" })

    const currentBranch = execSync(`git branch --show-current`, {
      encoding: "utf-8"
    }).trim()

    let branchExistsOnRemote = false
    try {
      const lsRemoteOut = execSync(
        `git ls-remote --heads origin ${currentBranch}`,
        { encoding: "utf-8" }
      )
      if (lsRemoteOut && lsRemoteOut.length > 0) {
        branchExistsOnRemote = true
      }
    } catch {
      branchExistsOnRemote = false
    }

    if (branchExistsOnRemote) {
      execSync(`git fetch origin ${currentBranch}`, { stdio: "inherit" })
      execSync(`git pull --rebase origin ${currentBranch}`, {
        stdio: "inherit"
      })
      execSync(`git push origin HEAD`, { stdio: "inherit" })
    } else {
      execSync(`git push -u origin HEAD`, { stdio: "inherit" })
    }
  } catch (error) {
    console.error("Error in commitChanges:", error)
    throw error
  }
}

/**
 * ensurePullRequest:
 * ------------------------------------------------------------------
 * Checks if there's already an open PR from branchName -> main.
 * If not, creates a new one with the given "featureRequest"
 * as the title or part of the title.
 *
 * @param octokit         The Octokit client
 * @param owner           The repo owner
 * @param repo            The repo name
 * @param branchName      The feature branch
 * @param featureRequest  The user-provided feature request
 * @returns               The PR number
 */
export async function ensurePullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  featureRequest: string
): Promise<number> {
  const existing = await octokit.pulls.list({
    owner,
    repo,
    head: `${owner}:${branchName}`,
    state: "open"
  })
  if (existing.data.length > 0) {
    // If there's already an open PR, reuse it
    return existing.data[0].number
  }

  // Otherwise, create a new PR
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
 * ------------------------------------------------------------------
 * Recursively scans the local filesystem, ignoring certain large
 * or irrelevant folders. Used specifically in the "Text-to-Feature"
 * approach so the LLM sees the code structure.
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
        return
      }
      const entries = fs.readdirSync(currentPath)
      for (const entry of entries) {
        recurse(path.join(currentPath, entry))
      }
    } else {
      const fileName = path.basename(currentPath)
      if (excludeFiles.includes(fileName)) {
        return
      }
      let content = fs.readFileSync(currentPath, "utf-8")
      if (content.length > 20000) {
        content = content.slice(0, 20000) + "\n... [TRUNCATED]"
      }
      const relPath = path.relative(baseDir, currentPath)
      const snippet = `File: ${relPath}\n---\n${content}`
      output.push(snippet)
    }
  }

  recurse(baseDir)
  return output.join("\n\n")
}
