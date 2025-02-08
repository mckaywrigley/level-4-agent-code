/*
planner.ts
----------------------------------------------------------------------
The Planner Agent is responsible for taking a "feature request" string
(e.g., "Add a contact form") and turning it into a multi-step plan that
makes sense for this codebase.

It returns an array of steps, where each step is an object with:
  - stepName
  - stepDescription
  - stepPlan

Those steps are then individually executed by the Text-to-Feature agent.

We also gather the entire codebase context for the LLM, so it can see
the folder structure and some truncated file contents, ensuring the plan 
aligns with the existing code.
----------------------------------------------------------------------
*/

import { codeRules } from "@/constants/code-rules"
import { Step } from "@/types/step-types"
import { generateObject } from "ai"
import * as fs from "fs"
import * as path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

// The shape of the returned plan
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
 * ------------------------------------------------------------------
 * 1) Gathers the entire codebase listing as context (truncated).
 * 2) Provides it, along with the feature request, to the LLM
 *    in a structured prompt.
 * 3) Expects a JSON response with an array of steps to implement.
 *
 * @param featureRequest  The user input describing what needs to be built
 * @returns               An array of Step objects
 */
export async function runPlanner(featureRequest: string): Promise<Step[]> {
  // We collect the codebase context for the LLM
  const codebaseListing = gatherCodebaseContextForPlanner(process.cwd())
  console.log(
    `\n\n--- Codebase Listing Size ---\n~${codebaseListing.length / 4} tokens\n---`
  )

  const model = getLLMModel()
  const prompt = `
You are a frontend AI planner. You *only* plan frontend code.

User request: "${featureRequest}"

Below is the codebase context:
<codebase-listing>
${codebaseListing}
</codebase-listing>

Here are code rules:
<code-rules>
${codeRules}
</code-rules>

Return valid JSON only:
{
  "steps": [
    {"stepName":"Step1","stepDescription":"...","stepPlan":"..."},
    {"stepName":"Step2","stepDescription":"...","stepPlan":"..."}
  ]
}
`

  try {
    // Attempt to parse the LLM response using the Zod schema
    const result = await generateObject({
      model,
      schema: plannerSchema,
      schemaName: "plan",
      schemaDescription: "Plan out steps as an object with steps array",
      prompt,
      providerOptions: {
        openai: {
          reasoningEffort: "high"
        }
      }
    })

    console.log(
      `\n--- Planner LLM Result ---\n${JSON.stringify(result.object, null, 2)}\n--- End ---\n`
    )
    return result.object.steps
  } catch (error: any) {
    // If the LLM returned invalid JSON or something else failed, return a single "PlanError" step.
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
 * ------------------------------------------------------------------
 * Recursively reads the entire local directory, excluding certain
 * large or irrelevant folders, to gather the codebase context.
 * Truncates large files to keep token usage manageable.
 *
 * @param baseDir The root directory of the local codebase
 * @returns       A text dump of files and partial file contents
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
