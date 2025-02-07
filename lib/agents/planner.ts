/*
<ai_context>
The Planner Agent takes a single user request (feature_request) and breaks it
into a list of high-level steps. Each step has a title and a description.
</ai_context>
*/

import { generateObject } from "ai"
import { z } from "zod"
import { getLLMModel } from "./llm"

/**
 * plannerSchema:
 * - We expect an array of objects, each with "title" and "description".
 *   Example:
 *   [
 *     { "title": "Step1", "description": "Do X, Y, Z" },
 *     { "title": "Step2", "description": "Then do A, B, C" }
 *   ]
 */
const plannerSchema = z.array(
  z.object({
    title: z.string(),
    description: z.string()
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
export async function runPlanner(
  featureRequest: string
): Promise<{ title: string; description: string }[]> {
  const model = getLLMModel()
  const prompt = `
You are an AI planner. Given the user's request:

"${featureRequest}"

Break it down into a concise ordered list of steps to implement. Return valid JSON only, with the structure:
[
  {"title":"Step1","description":"Detailed instructions..."},
  {"title":"Step2","description":"..."}
]
Each step's "description" should describe the coding or config changes needed.
`

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
    return result.object
  } catch {
    // If there's an error (either from LLM or JSON parse), we default
    // to a single-step "PlanError".
    return [
      {
        title: "PlanError",
        description: "Unable to parse planning output."
      }
    ]
  }
}
