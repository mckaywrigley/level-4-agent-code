/**
 * test-gating.ts
 * --------------------------------------------------------------------
 * "Gating" step: Decides if we need new test generation at all, based
 * on changed files, existing tests, and possibly code review feedback.
 *
 * Example usage:
 *  - If the AI sees that we've only changed documentation or styling,
 *    it might skip generating new tests.
 *  - If there's a significant new feature, it might say we do need new tests.
 * --------------------------------------------------------------------
 */

import { generateObject } from "ai"
import { z } from "zod"
import { ReviewAnalysis } from "./code-review"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"

// Zod schema for the gating decision
const gatingSchema = z.object({
  decision: z.object({
    shouldGenerateTests: z.boolean(),
    reasoning: z.string(),
    recommendation: z.string()
  })
})

/**
 * gatingStep:
 * ------------------------------------------------------------------
 * 1) Posts a "we're checking tests" message on the PR.
 * 2) Calls gatingStepLogic(...) to see if we need new tests.
 * 3) Updates the PR comment with the gating result (e.g. "Skipping or continuing").
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

  // Evaluate gating logic
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
 * ------------------------------------------------------------------
 * Builds a prompt that includes changed files, existing tests,
 * and code review notes. Asks the LLM to return a simple JSON
 * with a boolean "shouldGenerateTests".
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

  const prompt = `
You are an expert in deciding if tests are needed.

If you see *anything* new that should be tested or that breaks existing tests, return true.
Only generate tests for frontend code in /app. Only unit tests in __tests__/unit.

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

  console.log(`\n--- Gating Prompt ---\n${prompt}\n---`)
  const model = getLLMModel()

  try {
    const result = await generateObject({
      model,
      schema: gatingSchema,
      schemaName: "decision",
      schemaDescription: "Decision for test generation",
      prompt,
      providerOptions: {
        openai: {
          reasoningEffort: "high"
        }
      }
    })

    console.log(
      `\n--- Gating Result ---\n${JSON.stringify(result.object, null, 2)}\n---`
    )
    return {
      shouldGenerate: result.object.decision.shouldGenerateTests,
      reason: result.object.decision.reasoning,
      recommendation: result.object.decision.recommendation
    }
  } catch (err) {
    // If an error occurs, default to no new tests
    return { shouldGenerate: false, reason: "Gating error", recommendation: "" }
  }
}
