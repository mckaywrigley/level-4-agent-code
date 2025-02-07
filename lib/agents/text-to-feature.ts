/*
<ai_context>
The "Text-to-Feature" agent takes a single step description and the current repo
state, then returns a list of file changes (full file contents). We then apply
those changes locally, and commit/push them to the new feature branch.
</ai_context>
*/

import { generateObject } from "ai"
import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

/**
 * changesSchema:
 * - We expect an array of objects, each with "file" and "content".
 * - "file" is the path to the file (e.g. "app/page.tsx")
 * - "content" is the full new content for that file.
 */
const changesSchema = z.array(
  z.object({
    file: z.string(),
    content: z.string()
  })
)

/**
 * getFileChangesForStep:
 * - Calls our LLM with a prompt describing the single step to implement.
 * - The LLM returns a JSON array of file changes that need to be applied.
 */
export async function getFileChangesForStep(
  stepDescription: string
): Promise<{ file: string; content: string }[]> {
  const model = getLLMModel()

  // The LLM is expected to return valid JSON with a "file" and "content"
  // for each changed file.
  const prompt = `
You are given a step description for a coding task:
"${stepDescription}"

Output an array of objects describing the new or updated files. Return valid JSON only, matching:
[
  {"file":"path/to/file.tsx","content":"(full file content here)"},
  ...
]

Include the complete file content that should exist after this step.
If the file already exists, provide its updated content. If it's new, provide new content.
`

  try {
    const result = await generateObject({
      model,
      schema: changesSchema,
      schemaName: "changes",
      schemaDescription: "An array of file changes",
      prompt
    })
    return result.object
  } catch {
    // If we fail to parse the LLM's response, we return an empty array (no changes)
    return []
  }
}

/**
 * applyFileChanges:
 * - Takes an array of { file, content } objects, and writes them to the local filesystem.
 * - If directories in the path don't exist, it creates them recursively.
 */
export function applyFileChanges(changes: { file: string; content: string }[]) {
  for (const change of changes) {
    const target = path.join(process.cwd(), change.file)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, change.content, "utf-8")
  }
}

/**
 * switchToFeatureBranch:
 * - We first checkout main (pulling latest changes).
 * - Then we create a new branch by the name "branchName" if it doesn't exist,
 *   or switch to it if it does.
 */
export function switchToFeatureBranch(branchName: string) {
  try {
    execSync(`git checkout main`, { stdio: "inherit" })
  } catch {
    // ignore any error
  }
  try {
    execSync(`git pull origin main`, { stdio: "inherit" })
  } catch {
    // ignore any error
  }
  try {
    execSync(`git checkout -b ${branchName}`, { stdio: "inherit" })
  } catch {
    // If that fails, presumably the branch already exists, so we just switch to it
    execSync(`git checkout ${branchName}`, { stdio: "inherit" })
  }
}

/**
 * commitChanges:
 * - Adds all changes, commits them with the provided message, and pushes to origin HEAD.
 * - This ensures our new code is reflected in the remote GitHub repository under the feature branch.
 */
export function commitChanges(message: string) {
  execSync(`git add .`, { stdio: "inherit" })
  execSync(`git commit -m "${message}"`, { stdio: "inherit" })
  execSync(`git push origin HEAD`, { stdio: "inherit" })
}
