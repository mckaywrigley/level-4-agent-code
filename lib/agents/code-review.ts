/**
 * The "code-review.ts" module is responsible for generating a code review summary for a PR.
 * It uses an LLM (Large Language Model) to create feedback about the changes in the pull request.
 *
 * High-level process:
 * 1. We create a consolidated prompt, combining the PR's changed files/patches.
 * 2. We pass this prompt to the model, requesting a structured JSON response.
 * 3. The JSON includes a summary, file-by-file analyses, and overall suggestions.
 * 4. We then return and post these results as a comment on GitHub.
 */

import { generateObject } from "ai"
import { z } from "zod"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContext } from "./pr-context"

/**
 * This schema is used to define the structure of the JSON we expect from the LLM.
 * We parse the LLM's response against this schema to ensure correctness.
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

// The TypeScript type of the parsed JSON response from our LLM.
export type ReviewAnalysis = z.infer<typeof reviewSchema>

/**
 * handleReviewAgent:
 * - Orchestrates the entire code-review step.
 * - Calls generateReview() to get the review from the LLM.
 * - Updates the PR comment with the new data (summary, file analyses, suggestions).
 */
export async function handleReviewAgent(
  octokit: any,
  context: PullRequestContext,
  reviewCommentId: number,
  reviewBody: string
): Promise<ReviewAnalysis | undefined> {
  // get the actual analysis JSON from our LLM
  const analysis = await generateReview(context)

  // Append the summary, file analyses, and suggestions to the existing comment body
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

  // Update the GitHub comment with the final code review content
  await updateComment(octokit, context, reviewCommentId, reviewBody)

  return analysis
}

/**
 * generateReview:
 * - Builds a prompt using the changed PR files (including patches and optionally file contents).
 * - Calls the LLM with that prompt to obtain structured JSON review data.
 * - If parsing fails, returns a fallback object indicating an error.
 */
async function generateReview(
  context: PullRequestContext
): Promise<ReviewAnalysis> {
  // Prepare text blocks for changed files
  const changedFilesPrompt = context.changedFiles
    .map(f => {
      // If excluded, we note that we're not including content details in the prompt
      if (f.excluded) return `File: ${f.filename} [EXCLUDED FROM PROMPT]`
      // Otherwise, include patch + file content
      return `File: ${f.filename}\nPatch:\n${f.patch}\nContent:\n${f.content ?? ""}`
    })
    .join("\n---\n")

  /**
   * This prompt is a carefully structured text we send to the LLM, explaining
   * how we want the response (in valid JSON) and specifying the relevant PR details.
   */
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
Changed Files:
${changedFilesPrompt}
`
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Review prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  // Obtain the configured LLM model (OpenAI or Anthropic, etc.)
  const modelInfo = getLLMModel()

  try {
    // Use ai-sdk's generateObject to parse strictly into the schema we declared above.
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
    // If there's an error or the LLM's JSON wasn't valid, return a fallback.
    return {
      summary: "Review parse error",
      fileAnalyses: [],
      overallSuggestions: []
    }
  }
}
