/**
 * code-review.ts
 * --------------------------------------------------------------------
 * This module handles the AI-based code review process for new code changes.
 *
 * Main responsibilities:
 *  - Analyze changed files and commit messages to produce a code review summary.
 *  - Return structured JSON that highlights a summary, file-by-file analyses,
 *    and overall suggestions.
 *  - Post or update a pull-request comment with these review details.
 *
 * Key Exports:
 *  - `handleReviewAgent(...)`: Orchestrates the entire code review step
 *    and updates a PR comment with the results.
 *  - `reviewSchema`: A Zod schema that defines the shape of the JSON
 *    returned by the LLM for a code review.
 *
 * Workflow:
 *  1) Collect changed file patches from the context.
 *  2) Pass them to the LLM with a structured prompt requesting a JSON response.
 *  3) Parse the LLM's response with Zod to ensure it's valid JSON.
 *  4) Post the results back to the GitHub PR comment.
 * --------------------------------------------------------------------
 */

import { generateObject } from "ai"
import { z } from "zod"
import { updateComment } from "./github-comments"
import { getLLMModel } from "./llm"
import { PullRequestContext } from "./pr-context"

// Defines the expected shape of the LLM's code review response.
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

// Type used internally and externally to represent the review output.
export type ReviewAnalysis = z.infer<typeof reviewSchema>

/**
 * handleReviewAgent:
 * ------------------------------------------------------------------
 * Orchestrates the code review step for a given PullRequestContext,
 * typically after new code changes are made.
 *
 * Steps:
 *  1) Calls generateReview(...) to gather code review from the LLM.
 *  2) Appends that review to the existing body of a PR comment.
 *  3) Updates the comment in GitHub with the summarized results.
 *
 * @param octokit          The Octokit GitHub client instance.
 * @param context          The pull request context containing changed files, etc.
 * @param reviewCommentId  The ID of the PR comment to update.
 * @param reviewBody       The current body of the comment to which we append review results.
 * @returns                The structured review analysis from the LLM or undefined on error.
 */
export async function handleReviewAgent(
  octokit: any,
  context: PullRequestContext,
  reviewCommentId: number,
  reviewBody: string
): Promise<ReviewAnalysis | undefined> {
  // 1) Ask the LLM to produce a code review for the changed files
  const analysis = await generateReview(context)

  // 2) Append the results to the existing comment body
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

  // 3) Update the comment on the PR
  await updateComment(octokit, context, reviewCommentId, reviewBody)
  return analysis
}

/**
 * generateReview:
 * ------------------------------------------------------------------
 * Builds a prompt for the changed PR files and commit messages, sends
 * it to the LLM, and returns a structured JSON code review.
 *
 * @param context  PullRequestContext with changed file patches and commit messages
 * @returns        The structured JSON code review or fallback if parsing fails.
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

  // The actual textual prompt we send to the LLM
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

  console.log(`\n\n--- Code Review Prompt (generateReview) ---\n${prompt}\n---`)

  // Decide which LLM model to use (OpenAI or Anthropic).
  const modelInfo = getLLMModel()

  try {
    // generateObject helps parse the model's response directly into a typed object
    const result = await generateObject({
      model: modelInfo,
      schema: reviewSchema,
      schemaName: "review",
      schemaDescription: "Code review feedback in JSON",
      prompt,
      providerOptions: {
        openai: {
          reasoningEffort: "high"
        }
      }
    })

    console.log(
      `\n\n--- Code Review Result ---\n${JSON.stringify(result.object, null, 2)}\n---`
    )
    return result.object
  } catch (err) {
    // Fallback if something went wrong with parsing or the model's output.
    return {
      summary: "Review parse error",
      fileAnalyses: [],
      overallSuggestions: []
    }
  }
}
