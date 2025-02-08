/**
 * The "code-review.ts" module is responsible for generating a code review summary for the changes.
 * We use local diffs from context.changedFiles, not remote content from GitHub.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContext } from "./pr-context"

/**
 * This schema is used to define the structure of the JSON we expect from the LLM.
 */
export const reviewSchema = z.object({
  summary: z.string(),
  fileAnalyses: z.array(
    z.object({
      path: z.string(),
      analysis: z.string()
    })
  ),
  overallSuggestions: z.array(z.string())
})

export type ReviewAnalysis = z.infer<typeof reviewSchema>

/**
 * handleReviewAgent:
 * - Orchestrates the entire code-review step.
 * - Calls generateReview() to get the review from the LLM.
 * - Updates the PR comment with the new data.
 */
export async function handleReviewAgent(
  octokit: any,
  context: PullRequestContext,
  reviewCommentId: number,
  reviewBody: string
): Promise<ReviewAnalysis | undefined> {
  const analysis = await generateReview(context)

  // Append info to the comment body
  reviewBody += "\n\n**Summary**\n" + analysis.summary
  if (analysis.fileAnalyses.length > 0) {
    reviewBody += "\n\n**File Analyses**\n"
    for (const f of analysis.fileAnalyses) {
      reviewBody += `\n- **${f.path}**: ${f.analysis}`
    }
  }
  if (analysis.overallSuggestions.length > 0) {
    reviewBody += "\n\n**Suggestions**\n"
    for (const s of analysis.overallSuggestions) {
      reviewBody += `- ${s}\n`
    }
  }

  await updateComment(octokit, context, reviewCommentId, reviewBody)
  return analysis
}

/**
 * generateReview:
 * - Builds a prompt using the changed PR files (patches, etc.) from local context.
 * - Calls the LLM with that prompt to obtain structured JSON review data.
 * - If parsing fails, returns a fallback object.
 */
async function generateReview(
  context: PullRequestContext
): Promise<ReviewAnalysis> {
  // Prepare text blocks for changed files
  const changedFilesPrompt = context.changedFiles
    .map(f => {
      if (f.excluded) return `File: ${f.filename} [EXCLUDED FROM PROMPT]`
      return `File: ${f.filename}\nPatch:\n${f.patch}\n\n(We do not have full content embedded, just patch changes.)`
    })
    .join("\n---\n")

  const prompt = `
You are an expert code reviewer. Return valid JSON only, with the structure:
{
  "summary": "string",
  "fileAnalyses": [
    { "path": "string", "analysis": "string" }
  ],
  "overallSuggestions": ["string"]
}

PR Title: ${context.title}
Commits:
${context.commitMessages.map(m => `- ${m}`).join("\n")}
Changed Files (patches):
${changedFilesPrompt}
`

  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Review prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  const modelInfo = getLLMModel()
  try {
    const result = await generateObject({
      model: modelInfo,
      schema: reviewSchema,
      schemaName: "review",
      schemaDescription: "Code review feedback in JSON",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(`Review result:\n${JSON.stringify(result.object, null, 2)}`)
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object
  } catch (err) {
    return {
      summary: "Review parse error",
      fileAnalyses: [],
      overallSuggestions: []
    }
  }
}
