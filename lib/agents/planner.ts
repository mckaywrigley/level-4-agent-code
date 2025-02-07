/*
<ai_context>
The Planner Agent takes a single user request (feature_request) and breaks it
into a list of high-level steps. Each step has a title and a description.
</ai_context>
*/

import { Step } from "@/types/step-types"
import { generateObject } from "ai"
import { z } from "zod"
import { getLLMModel } from "./llm"

/**
 * plannerSchema:
 * - We expect an array of objects, each with "stepName", "stepDescription", and "stepPlan".
 *   Example:
 *   [
 *     { "stepName": "Step1", "stepDescription": "1-2 sentences describing the step", "stepPlan": "Plan for the step" },
 *     { "stepName": "Step2", "stepDescription": "1-2 sentences describing the step", "stepPlan": "Plan for the step" }
 *   ]
 */
const plannerSchema = z.array(
  z.object({
    stepName: z.string(),
    stepDescription: z.string(),
    stepPlan: z.string()
  })
)

/**
 * runPlanner:
 * - Accepts a single "featureRequest" string from the user describing what
 *   they want to build.
 * - Calls the LLM model with instructions to break that request into steps,
 *   returning valid JSON that matches the plannerSchema.
 * - If there's a parsing error, we provide a fallback step indicating an error.
 */
export async function runPlanner(featureRequest: string): Promise<Step[]> {
  const model = getLLMModel()
  const prompt = `
You are an AI planner. Given the user's request:

"${featureRequest}"

Break it down into a concise ordered list of steps to implement. Return valid JSON only, with the structure:
[
  {"stepName":"Step1","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"},
  {"stepName":"Step2","stepDescription":"1-2 sentences describing the step","stepPlan":"Plan for the step"}
]
`
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Planner prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  try {
    // "generateObject" from 'ai' library attempts to parse the LLM output
    // as structured JSON conforming to the "plannerSchema" definition.
    const result = await generateObject({
      model,
      schema: plannerSchema,
      schemaName: "plan",
      schemaDescription: "Plan out steps as an array",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(`Planner result:\n${JSON.stringify(result.object, null, 2)}`)
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object
  } catch {
    // If there's an error (either from LLM or JSON parse), we default
    // to a single-step "PlanError".
    return [
      {
        stepName: "PlanError",
        stepDescription: "Unable to parse planning output.",
        stepPlan: ""
      }
    ]
  }
}
