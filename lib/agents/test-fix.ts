/**
 * This file implements the logic for attempting to "fix" failing tests in an iterative loop.
 * If tests fail, we provide the test error output to the AI model,
 * letting it refine or create new test code to address the failures.
 */

import { PullRequestContextWithTests } from "./pr-context"
import { handleTestGeneration } from "./test-proposals"

/**
 * handleTestFix:
 * - Called when our main test loop sees a failing result.
 * - We build a prompt that includes the failing test output and ask the AI to fix or generate improved tests.
 * - Internally, this calls the same "handleTestGeneration" but with a special "fixPrompt" appended.
 */
export async function handleTestFix(
  octokit: any,
  context: PullRequestContextWithTests,
  iteration: number,
  testErrorOutput: string,
  testCommentId: number,
  testBody: string
) {
  // We pass the test error output to the AI so it knows what's failing
  const fixPrompt = `
We have failing tests (attempt #${iteration}).
Here is the error output:
${testErrorOutput}

Please fix or create new tests as needed, returning JSON in the same format.
`
  console.log(`\n\n\n\n\n--------------------------------`)
  console.log(`Test fix prompt:\n${fixPrompt}`)
  console.log(`--------------------------------\n\n\n\n\n`)

  // Under the hood, handleTestGeneration will commit the newly proposed test changes
  await handleTestGeneration(
    octokit,
    context,
    undefined,
    testCommentId,
    testBody + fixPrompt
  )
}
