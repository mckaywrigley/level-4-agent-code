/**
 * This file provides a dedicated function to generate "test fix" proposals,
 * i.e., updated or new test files specifically targeting a known failing test scenario.
 */

import { generateObject } from "ai"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"

// Reuse the same testProposalsSchema & TestProposal interface from test-proposals.
import { TestProposal, testProposalsSchema } from "./test-proposals"

export async function generateTestFixProposals(
  context: PullRequestContextWithTests,
  testErrorOutput: string,
  iteration: number
): Promise<TestProposal[]> {
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

  const prompt = `
You are an expert in diagnosing and fixing failing tests. This is iteration #${iteration}.

We have the following Jest error output indicating test failures:
${testErrorOutput}

Please update or create test files in the same JSON format as normal new tests:
{
  "testProposals": [
    {
      "filename": "string",
      "testContent": "string",
      "actions": {
        "action": "create" | "update" | "rename",
        "oldFilename": "string"
      }
    }
  ]
}

Only generate tests for code in /app (frontend), in __tests__/unit. 
Use React Testing Library if it's React/JSX. 
Always import "@testing-library/jest-dom" and "@testing-library/react".

Title: ${context.title}
Commits:
${context.commitMessages.map(m => `- ${m}`).join("\n")}
Changed Files:
${changedFilesPrompt}

Existing Tests:
${existingTestsPrompt}
`

  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Test fix prompt:\n${prompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  const modelInfo = getLLMModel()

  try {
    const result = await generateObject({
      model: modelInfo,
      schema: testProposalsSchema,
      schemaName: "testProposals",
      schemaDescription: "Proposed test fixes in JSON",
      prompt
    })
    console.log(`\n\n\n\n\n--------------------------------`)
    console.log(`Test fix result:\n${JSON.stringify(result.object, null, 2)}`)
    console.log(`--------------------------------\n\n\n\n\n`)
    return result.object.testProposals
  } catch (err) {
    console.error("Error generating test fix proposals:", err)
    return []
  }
}
