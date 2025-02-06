/**
 * This module determines which LLM provider to use (OpenAI or Anthropic),
 * and returns a function that can be used to call the model with a prompt.
 */

import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"

/**
 * getLLMModel:
 * - Looks at environment variables to see which provider is chosen: 'openai' or 'anthropic'.
 * - Creates a model function from the respective AI SDK.
 * - If the environment variables (like API keys) are missing, it throws an error.
 * - The returned function is used by other modules (e.g., code-review.ts) to call the LLM with a prompt.
 */
export function getLLMModel() {
  // Defaults to "openai" if no LLM_PROVIDER specified
  const provider = process.env.LLM_PROVIDER || "openai"

  // Default model names if none are provided by environment
  const openAIDefaultModel = "o3-mini"
  const anthropicDefaultModel = "claude-3-5-sonnet-latest"

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY for Anthropic usage.")
    }
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    return anthropic(process.env.LLM_MODEL || anthropicDefaultModel)
  }

  // Fallback: default to OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY for OpenAI usage.")
  }

  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    compatibility: "strict"
  })
  return openai(process.env.LLM_MODEL || openAIDefaultModel)
}
