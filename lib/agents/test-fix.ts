/**
 * This file implements logic for attempting to fix failing tests in an iterative loop.
 * If tests fail, we provide the test error output to the AI so it knows what's failing.
 * We now use a dedicated "generateTestFixProposals" function that includes the failing
 * Jest output in the LLM prompt, producing updated or new tests to fix the errors.
 */

import { updateComment } from "./github-comments"
import { PullRequestContextWithTests } from "./pr-context"
import { generateTestFixProposals } from "./test-fix-proposals"
import { commitTestsLocally } from "./test-proposals"

/**
 * handleTestFix:
 * - Called when our main test loop sees a failing result.
 * - We pass the test error output to the AI so it can propose updated/new tests that fix the failures.
 */
export async function handleTestFix(
  octokit: any,
  context: PullRequestContextWithTests,
  iteration: number,
  testErrorOutput: string,
  testCommentId: number,
  testBody: string
) {
  // Let the comment reflect we’re generating a fix:
  testBody += `\n\n**Test Fix Attempt #${iteration}**`
  testBody += `\nError output:\n\`\`\`\n${testErrorOutput}\n\`\`\`\n`
  testBody += "Generating fix proposals..."

  await updateComment(octokit, context, testCommentId, testBody)

  // 1) Actually generate the fix proposals using the new function
  const proposals = await generateTestFixProposals(
    context,
    testErrorOutput,
    iteration
  )

  // 2) If proposals are returned, commit them
  if (proposals.length > 0) {
    await commitTestsLocally(proposals)

    testBody += `\n\n**Proposed test fixes**:\n`
    for (const p of proposals) {
      testBody += `- ${p.filename}\n`
    }
  } else {
    testBody += "\nNo fix proposals were returned."
  }

  await updateComment(octokit, context, testCommentId, testBody)
}
