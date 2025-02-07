/*
<ai_context>
The Planner Agent takes a single user request (feature_request) and breaks it
into a list of high-level steps. Each step has a title and a description, but
now we also provide the agent with the codebase context (file paths + contents)
so it can plan more accurately in the context of the existing code.
</ai_context>
*/

import { codeRules } from "@/constants/code-rules"
import { Step } from "@/types/step-types"
import { generateObject } from "ai"
import * as fs from "fs"
import * as path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

/**
 * plannerSchema:
 * - We expect an object with a `steps` array, where each step is an object with "stepName", "stepDescription", and "stepPlan".
 *   Example:
 *   {
 *     "steps": [
 *       {"stepName":"Step1","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"},
 *       {"stepName":"Step2","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"}
 *     ]
 *   }
 */
const plannerSchema = z.object({
  steps: z.array(
    z.object({
      stepName: z.string(),
      stepDescription: z.string(),
      stepPlan: z.string()
    })
  )
})

/**
 * runPlanner:
 * - Accepts the "featureRequest" string from the user describing what
 *   they want to build.
 * - Gathers the local codebase context (file paths + contents) so the
 *   LLM can plan in the context of the existing code.
 * - Calls the LLM model with instructions to break that request into steps,
 *   returning valid JSON that matches the plannerSchema.
 * - If there's a parsing error, we provide a fallback step indicating an error.
 */
export async function runPlanner(featureRequest: string): Promise<Step[]> {
  // 1) Gather codebase context (excluding large or lock files)
  const codebaseListing = gatherCodebaseContextForPlanner(process.cwd())
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Codebase Length:\n~${codebaseListing.length / 4} tokens`)
  console.log(`--------------------------------\n\n\n\n\n`)

  // 2) Prepare the model and the final prompt
  const model = getLLMModel()

  // We'll place the codebase listing after the user request, so the LLM can plan with full context
  // But let's keep a comment telling it: "Here is the codebase context"
  const prompt = `
You are a frontend AI planner. You *only* plan frontend code. Another AI will handle other parts of the codebase.

Given the user's request:
"${featureRequest}"

Below is the codebase context, showing file paths and contents (truncated if large). Use it to plan changes. Do not provide the entire code again, just keep in mind it's here for reference:

<codebase-listing>
${codebaseListing}
</codebase-listing>

Here are some rules for the codebase:
<code-rules>
${codeRules}
</code-rules>

Now, break the user's request into a concise ordered list of steps to implement. Return valid JSON only, with the structure:
{
  "steps": [
    {"stepName":"Step1","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"},
    {"stepName":"Step2","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"}
  ]
}

Be sure to incorporate knowledge of the existing code if relevant.
`

  try {
    // "generateObject" from 'ai' library attempts to parse the LLM output
    // as structured JSON conforming to the "plannerSchema" definition.
    const result = await generateObject({
      model,
      schema: plannerSchema,
      schemaName: "plan",
      schemaDescription: "Plan out steps as an object with steps array",
      prompt
    })

    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(
      `\n\n---   Planner LLM Result ---\n${JSON.stringify(result.object, null, 2)}\n--- End ---\n`
    )
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object.steps
  } catch (error: any) {
    // If there's an error (either from LLM or JSON parse), we default
    // to a single-step "PlanError".
    return [
      {
        stepName: "PlanError",
        stepDescription:
          "Unable to parse planning output or the codebase is too large.",
        stepPlan: ""
      }
    ]
  }
}

/**
 * gatherCodebaseContextForPlanner:
 * - Recursively scans the local filesystem starting from `baseDir`.
 * - Excludes certain files (lockfiles, node_modules, etc.).
 * - If a file is larger than 12,000 chars, we skip it as well.
 * - Returns a single string that lists all included files with contents.
 *
 * Note: For very large projects, this might be quite big. You may want to do
 * additional filtering or chunking, but for now we provide a simple approach.
 */
function gatherCodebaseContextForPlanner(baseDir: string): string {
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

      // We'll just store it
      const snippet = `File: ${relPath}\n---\n${content}`
      output.push(snippet)
    }
  }

  recurse(baseDir)

  // Join them with blank lines
  return output.join("\n\n")
}
