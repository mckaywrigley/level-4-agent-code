/**
 * This file implements a "gating" step:
 * Before we generate or fix tests, we decide whether test generation is needed at all.
 * The LLM returns a boolean plus a reasoning.
 * If it says "false," we skip test generation and end the workflow.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { ReviewAnalysis } from "./code-review"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"

// We define a simple schema for the gating decision JSON.
const gatingSchema = z.object({
  decision: z.object({
    shouldGenerateTests: z.boolean(),
    reasoning: z.string(),
    recommendation: z.string()
  })
})

/**
 * gatingStep:
 * - Posts a comment indicating that we're checking if test generation is necessary.
 * - Calls gatingStepLogic to evaluate the PR changes, existing tests, and code review notes.
 * - If the gating says "no," we skip test generation.
 * - Returns an object with `shouldGenerate`, plus any updated comment body text.
 */
export async function gatingStep(
  context: PullRequestContextWithTests,
  octokit: any,
  testCommentId: number,
  testBody: string,
  reviewAnalysis?: ReviewAnalysis
) {
  testBody += "\n\n**Gating Step**: Checking if we should generate tests..."
  await updateComment(octokit, context, testCommentId, testBody)

  // Evaluate the gating logic (calls the LLM)
  const gating = await gatingStepLogic(context, reviewAnalysis)
  if (!gating.shouldGenerate) {
    testBody += `\n\nSkipping test generation: ${gating.reason}`
    await updateComment(octokit, context, testCommentId, testBody)
  }

  return {
    shouldGenerate: gating.shouldGenerate,
    reason: gating.reason,
    testBody
  }
}

/**
 * gatingStepLogic:
 * - Builds a prompt that includes the changed files, existing tests, and the code review analysis.
 * - Asks the LLM to return JSON with a "shouldGenerateTests" boolean.
 * - If "shouldGenerateTests" is false, the workflow won't generate or fix tests.
 */
async function gatingStepLogic(
  context: PullRequestContextWithTests,
  reviewAnalysis?: ReviewAnalysis
) {
  // Summaries of existing tests
  const existingTestsPrompt = context.existingTestFiles
    .map(f => `Existing test: ${f.filename}\n---\n${f.content}`)
    .join("\n")

  // Summaries of changed files
  const changedFilesPrompt = context.changedFiles
    .map(file => {
      if (file.excluded) return `File: ${file.filename} [EXCLUDED]`
      return `File: ${file.filename}\nPatch:\n${file.patch}\nContent:\n${file.content}`
    })
    .join("\n---\n")

  let combinedRec = ""
  if (reviewAnalysis) {
    combinedRec = "Review Analysis:\n" + reviewAnalysis.summary
  }

  // We want the LLM to respond with structured JSON telling us if we should generate tests
  const prompt = `
You are an expert in deciding if tests are needed.

If you see *anything* new that should be tested or that breaks any existing tests, you should return true. Be thorough in your analysis.

You only generate tests for frontend related code in the /app directory.

You only generate unit tests in the __tests__/unit directory.

Return JSON only:
{
  "decision": {
    "shouldGenerateTests": true or false,
    "reasoning": "string",
    "recommendation": "string"
  }
}

Title: ${context.title}
Commits:
${context.commitMessages.map(m => `- ${m}`).join("\n")}
Changed Files:
${changedFilesPrompt}
Existing Tests:
${existingTestsPrompt}
${combinedRec}
`
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Gating prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)
  const model = getLLMModel()

  try {
    const result = await generateObject({
      model,
      schema: gatingSchema,
      schemaName: "decision",
      schemaDescription: "Decision for test generation",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(`Gating result:\n${JSON.stringify(result.object, null, 2)}`)
    console.log(`--------------------------------\n\n\n\n\n`)
    return {
      shouldGenerate: result.object.decision.shouldGenerateTests,
      reason: result.object.decision.reasoning,
      recommendation: result.object.decision.recommendation
    }
  } catch (err) {
    // If we can't parse the LLM response, we default to "do not generate"
    return { shouldGenerate: false, reason: "Gating error", recommendation: "" }
  }
}
