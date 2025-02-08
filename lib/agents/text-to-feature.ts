/*
<ai_context>
Focuses on reading/writing local files for each step. We commit to our local branch
and push. No more fetching from remote. We'll keep ensurePullRequest for creating the PR,
but won't fetch or rebase from remote if the branch doesn't exist — we do the standard
logic to avoid conflicts, etc.
</ai_context>
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
 * - Provides the entire codebase as context, plus any prior changes.
 */
export async function getFileChangesForStep(
  step: Step,
  accumulatedChanges: FileChange[]
): Promise<FileChange[]> {
  const model = getLLMModel()

  // We'll include prior changes in case the LLM needs them
  const priorChangesSnippet = accumulatedChanges
    .map(c => `File: ${c.file}\n---\n${c.content}`)
    .join("\n\n")

  // Gather entire codebase from local
  const codebaseListing = gatherFullCodebaseContextForFeature(process.cwd())

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

  const logPrompt = prompt
    .replace(codebaseListing, "[codebase listing omitted]")
    .replace(codeRules, "[code rules omitted]")

  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`File changes prompt:\n${logPrompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

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
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(
      `File changes result:\n${JSON.stringify(result.object, null, 2)}`
    )
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object.changedFiles
  } catch (error) {
    console.error("Error in getFileChangesForStep:", error)
    return []
  }
}

/**
 * applyFileChanges:
 * - Writes each { file, content } to disk.
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
 * - Checks out main, pulls latest, then checks if feature branch exists.
 * - If yes, checks it out. If no, create from main.
 */
export function switchToFeatureBranch(branchName: string) {
  try {
    execSync(`git checkout main`, { stdio: "inherit" })
    execSync(`git pull origin main`, { stdio: "inherit" })

    // See if remote branch exists
    execSync(`git fetch origin`, { stdio: "inherit" })
    const remoteBranches = execSync(`git branch -r`, { encoding: "utf-8" })
    const branchExistsRemotely = remoteBranches
      .split("\n")
      .some(line => line.trim() === `origin/${branchName}`)

    if (branchExistsRemotely) {
      // Checkout and rebase
      try {
        execSync(`git checkout ${branchName}`, { stdio: "inherit" })
      } catch {
        execSync(`git checkout -b ${branchName} origin/${branchName}`, {
          stdio: "inherit"
        })
      }
      execSync(`git pull origin ${branchName} --rebase`, { stdio: "inherit" })
    } else {
      execSync(`git checkout -b ${branchName}`, { stdio: "inherit" })
    }
  } catch (err) {
    console.error("Error in switchToFeatureBranch:", err)
    throw err
  }
}

/**
 * commitChanges:
 * - Add/commit, see if remote branch exists. If so, rebase + push.
 *   If not, create it with 'git push -u origin HEAD'.
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
 * - Checks if there's already a PR from branchName->main. If none, create it.
 * - We do not fetch or rebase from remote to get content; just open the PR for discussion.
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
    return existing.data[0].number
  }

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
 * - Recursively scans the local filesystem. Excludes large or irrelevant files.
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
