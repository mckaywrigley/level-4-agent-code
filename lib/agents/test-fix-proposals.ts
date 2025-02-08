/**
 * test-fix-proposals.ts
 * --------------------------------------------------------------------
 * This file deals with generating proposals to fix failing tests.
 *
 * For example, if our standard test run says certain tests fail,
 * we pass the failing output to the LLM and ask it to propose
 * modifications or new test files to remedy the issues.
 *
 * It's very similar to `test-proposals.ts` but specialized for
 * "fixing" existing tests rather than creating new ones from scratch.
 * --------------------------------------------------------------------
 */

import { generateObject } from "ai"
import { getLLMModel } from "./llm"
import { PullRequestContextWithTests } from "./pr-context"
import { TestProposal, testProposalsSchema } from "./test-proposals"

/**
 * generateTestFixProposals:
 * ------------------------------------------------------------------
 * 1) We gather the failing test output, changed files, and existing test files.
 * 2) Prompt the LLM to propose test changes that would fix the failing scenario.
 * 3) The LLM returns an array of file modifications or new test files,
 *    in the same JSON shape we used for normal test proposals.
 */
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

  console.log(`\n\n--- Test Fix Prompt #${iteration} ---\n${prompt}\n---`)

  const modelInfo = getLLMModel()

  try {
    // Use the same testProposalsSchema as normal test proposals
    const result = await generateObject({
      model: modelInfo,
      schema: testProposalsSchema,
      schemaName: "testProposals",
      schemaDescription: "Proposed test fixes in JSON",
      prompt,
      providerOptions: {
        openai: {
          reasoningEffort: "high"
        }
      }
    })

    console.log(
      `\n--- Test Fix Proposals #${iteration} ---\n${JSON.stringify(result.object, null, 2)}\n---`
    )
    return result.object.testProposals
  } catch (err) {
    console.error("Error generating test fix proposals:", err)
    return []
  }
}
