/**
 * This file implements logic for attempting to fix failing tests in an iterative loop.
 * If tests fail, we provide the test error output to the AI model to refine or create
 * new test code. We do NOT change the local-vs-remote logic here; we simply rely on
 * local files being up to date.
 */

import { PullRequestContextWithTests } from "./pr-context"
import { handleTestGeneration } from "./test-proposals"

/**
 * handleTestFix:
 * - Called when our main test loop sees a failing result.
 * - We pass the test error output to the AI so it knows what's failing.
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

  await handleTestGeneration(
    octokit,
    context,
    undefined,
    testCommentId,
    testBody + fixPrompt
  )
}
