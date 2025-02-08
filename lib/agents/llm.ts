/**
 * This module chooses which LLM provider to use. No changes needed regarding local vs remote files.
 */

import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"

export function getLLMModel() {
  const provider = process.env.LLM_PROVIDER || "openai"

  const openAIDefaultModel = "o3-mini"
  const anthropicDefaultModel = "claude-3-5-sonnet-latest"

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY.")
    }
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    return anthropic(process.env.LLM_MODEL || anthropicDefaultModel)
  }

  // Default: OpenAI
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.")
  }
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    compatibility: "strict"
  })
  return openai(process.env.LLM_MODEL || openAIDefaultModel)
}
