/**
 * test-fix.ts
 * --------------------------------------------------------------------
 * When our main test loop sees failing test results, we run this code
 * to propose updated or new tests to fix the errors.
 *
 * Key steps:
 *  - We gather the error output from the failing test run.
 *  - Pass it to `generateTestFixProposals(...)`.
 *  - Write any returned files to disk.
 *  - Commit and push the changes, so the PR is updated with the fix attempt.
 * --------------------------------------------------------------------
 */

import { updateComment } from "./github-comments"
import { PullRequestContextWithTests } from "./pr-context"
import { generateTestFixProposals } from "./test-fix-proposals"
import { commitTestsLocally } from "./test-proposals"
import { commitChanges } from "./text-to-feature"

/**
 * handleTestFix:
 * ------------------------------------------------------------------
 * Called whenever we have failing tests.
 *
 * 1) We show the error output in the PR comment.
 * 2) Generate fix proposals from the LLM.
 * 3) If proposals are returned, we write them and commit them.
 * 4) The test loop will then re-run to see if the fix helped.
 */
export async function handleTestFix(
  octokit: any,
  context: PullRequestContextWithTests,
  iteration: number,
  testErrorOutput: string,
  testCommentId: number,
  testBody: string
) {
  // Post an update to the PR comment about the test fix attempt
  testBody += `\n\n**Test Fix Attempt #${iteration}**`
  testBody += `\nError output:\n\`\`\`\n${testErrorOutput}\n\`\`\`\n`
  testBody += "Generating fix proposals..."

  await updateComment(octokit, context, testCommentId, testBody)

  // 1) Generate fix proposals
  const proposals = await generateTestFixProposals(
    context,
    testErrorOutput,
    iteration
  )

  // 2) If we got proposals, write them to disk, commit, push
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

  // 3) Update the PR comment with the fix details
  await updateComment(octokit, context, testCommentId, testBody)
}
