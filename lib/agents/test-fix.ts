/**
 * test-fix.ts
 *
 * When our main test loop sees failing results, we run this code
 * to propose updated or new tests that fix the errors.
 *
 * Updated to commit these test fixes after writing them to local disk.
 */

import { updateComment } from "./github-comments"
import { PullRequestContextWithTests } from "./pr-context"
import { generateTestFixProposals } from "./test-fix-proposals"
import { commitTestsLocally } from "./test-proposals"
import { commitChanges } from "./text-to-feature" // <--- Import commitChanges

/**
 * handleTestFix:
 * - Called when we have failing test results. We pass the test error output to the LLM
 *   to propose updated/new tests that fix the failures.
 * - After saving them locally, we also do a commit/push so they're visible on the PR branch.
 */
export async function handleTestFix(
  octokit: any,
  context: PullRequestContextWithTests,
  iteration: number,
  testErrorOutput: string,
  testCommentId: number,
  testBody: string
) {
  testBody += `\n\n**Test Fix Attempt #${iteration}**`
  testBody += `\nError output:\n\`\`\`\n${testErrorOutput}\n\`\`\`\n`
  testBody += "Generating fix proposals..."

  await updateComment(octokit, context, testCommentId, testBody)

  // 1) Actually generate the fix proposals
  const proposals = await generateTestFixProposals(
    context,
    testErrorOutput,
    iteration
  )

  // 2) If proposals are returned, write them + commit
  if (proposals.length > 0) {
    await commitTestsLocally(proposals)
    commitChanges(`AI test fix attempt #${iteration}`)

    testBody += `\n\n**Proposed test fixes**:\n`
    for (const p of proposals) {
      testBody += `- ${p.filename}\n`
    }
  } else {
    testBody += "\nNo fix proposals were returned."
  }

  await updateComment(octokit, context, testCommentId, testBody)
}
