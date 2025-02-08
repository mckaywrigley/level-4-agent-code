/*
<ai_context>
The Planner Agent. No changes needed regarding local vs remote, because it already
gathered codebase context from disk (like text-to-feature). So this remains basically the same.
</ai_context>
*/

import { codeRules } from "@/constants/code-rules"
import { Step } from "@/types/step-types"
import { generateObject } from "ai"
import * as fs from "fs"
import * as path from "path"
import { z } from "zod"
import { getLLMModel } from "./llm"

const plannerSchema = z.object({
  steps: z.array(
    z.object({
      stepName: z.string(),
      stepDescription: z.string(),
      stepPlan: z.string()
    })
  )
})

export async function runPlanner(featureRequest: string): Promise<Step[]> {
  const codebaseListing = gatherCodebaseContextForPlanner(process.cwd())
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Codebase Length:\n~${codebaseListing.length / 4} tokens`)
  console.log(`--------------------------------\n\n\n\n\n`)

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
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(
      `\n\n--- Planner LLM Result ---\n${JSON.stringify(result.object, null, 2)}\n--- End ---\n`
    )
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object.steps
  } catch (error: any) {
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
