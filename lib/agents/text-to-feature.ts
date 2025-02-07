/*
<ai_context>
Extended with a new helper "ensurePullRequest" that either finds or creates
a PR from branch -> main. This is so each commit can run the "review/test"
logic on that open PR.
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
 * - The LLM returns a JSON array of file changes that need to be applied.
 */
export async function getFileChangesForStep(
  step: Step,
  accumulatedChanges: FileChange[]
): Promise<FileChange[]> {
  const model = getLLMModel()

  // We'll present the prior changes so the LLM can see them
  const priorChangesSnippet = accumulatedChanges
    .map(c => `File: ${c.file}\n---\n${c.content}`)
    .join("\n\n")

  const prompt = `
Below is a list of prior changes that have been made in earlier steps:
${priorChangesSnippet}

Now we have a new step:
Name: ${step.stepName}
Description: ${step.stepDescription}
Plan: ${step.stepPlan}

Given the existing modifications above, propose any additional or updated files needed for this step. Return JSON only:
{
  "changedFiles": [
    {"file":"path/to/whatever.ts","content":"..."}
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
    execSync(`git checkout -b ${branchName}`, { stdio: "inherit" })
  } catch {
    execSync(`git checkout ${branchName}`, { stdio: "inherit" })
  }
}

/**
 * commitChanges:
 * - Adds, commits with a message, pushes to origin HEAD
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
