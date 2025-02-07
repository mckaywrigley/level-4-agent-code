/*
<ai_context>
This script orchestrates the AI pipeline for a user-provided feature request.
Now, after each step's code changes are committed, we run the "pr-based AI flow"
logic on a PR. This ensures each step gets an AI code review + test generation
+ iterative test fixing, just like we previously did on normal pull requests.

Finally, after all steps pass, we run one last check and then open the PR fully.

Now updated to generate branch names based on date/time only,
instead of the feature request text. This avoids any issues
with extremely long or invalid names derived from user input.
</ai_context>
*/

import { runFlowOnLatestCommit } from "@/lib/agents/commit-step-flow"
import { runPlanner } from "@/lib/agents/planner"
import { runFlowOnPR } from "@/lib/agents/pr-step-flow"
import {
  applyFileChanges,
  commitChanges,
  ensurePullRequest,
  getFileChangesForStep,
  switchToFeatureBranch
} from "@/lib/agents/text-to-feature"
import { FileChange } from "@/types/file-types"
import { Step } from "@/types/step-types"
import { Octokit } from "@octokit/rest"

async function main() {
  const featureRequest = process.env.FEATURE_REQUEST
  if (!featureRequest) {
    console.error("Missing FEATURE_REQUEST environment variable.")
    process.exit(1)
  }

  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    console.error("No GITHUB_TOKEN found. Cannot proceed.")
    process.exit(1)
  }

  const repoStr = process.env.GITHUB_REPOSITORY
  if (!repoStr) {
    console.error("No GITHUB_REPOSITORY found. Cannot proceed.")
    process.exit(1)
  }

  const [owner, repo] = repoStr.split("/")
  const octokit = new Octokit({ auth: githubToken })

  // 1) Generate a date/time-based branch name.
  //    Example format: agent/20231101_1530
  //    (You can adjust the exact format as you like.)
  const now = new Date()
  // Build a simple YYYYMMDD_HHMM string
  const dateStr =
    now
      .toISOString() // e.g. 2023-11-01T15:30:59.123Z
      .replace(/[-:T]/g, "") // remove special chars so it's 20231101 153059.123Z
      .slice(0, 8) +
    "_" +
    now.toTimeString().slice(0, 5).replace(":", "") // e.g. 20231101_1530

  const branchName = `agent/${dateStr}`

  // 2) Switch/create the agent/<date/time> branch locally
  switchToFeatureBranch(branchName)

  // 3) Plan steps (Planner Agent)
  console.log(`\n--- Planning steps for: ${featureRequest} ---\n`)
  const steps = await runPlanner(featureRequest)

  if (!steps.length) {
    console.log("Planner returned no steps. Exiting.")
    process.exit(0)
  }

  // 4) We'll store all changes in an array, so the LLM sees them in subsequent steps
  let accumulatedChanges: FileChange[] = []

  // 5) Generate/commit the FIRST step (so the branch has a commit)
  const firstStep = steps[0]
  console.log(`\n--- Step 1: ${firstStep.stepName} ---\n`)

  const firstChanges = await getFileChangesForStep(
    firstStep,
    accumulatedChanges
  )
  applyFileChanges(firstChanges)

  // Add them to our "accumulated" record
  for (const fc of firstChanges) {
    accumulatedChanges = accumulatedChanges.filter(a => a.file !== fc.file)
    accumulatedChanges.push(fc)
  }

  // Commit and push
  commitChanges(`Step 1: ${firstStep.stepName}`)

  // 6) Now that the branch has commits, create/find the PR
  const prNumber = await ensurePullRequest(
    octokit,
    owner,
    repo,
    branchName,
    featureRequest
  )
  console.log(`PR #${prNumber} created/found.`)

  // 7) Run partial AI flow on the first commit
  let success = await runFlowOnLatestCommit(octokit, owner, repo, prNumber)
  if (!success) {
    console.error(`Tests failed on step 1. Exiting.`)
    process.exit(1)
  }

  // 8) If more steps remain, handle them
  for (let i = 1; i < steps.length; i++) {
    const step: Step = steps[i]
    console.log(`\n--- Step ${i + 1}: ${step.stepName} ---\n`)

    const newChanges = await getFileChangesForStep(step, accumulatedChanges)
    applyFileChanges(newChanges)
    commitChanges(`Step ${i + 1}: ${step.stepName}`)

    // Update our local record
    for (const c of newChanges) {
      accumulatedChanges = accumulatedChanges.filter(a => a.file !== c.file)
      accumulatedChanges.push(c)
    }

    // partial AI flow on each new commit
    success = await runFlowOnLatestCommit(octokit, owner, repo, prNumber)
    if (!success) {
      console.error(`Tests failed on step ${i + 1}. Exiting.`)
      process.exit(1)
    }
  }

  // 9) After all steps pass, run a final full PR review
  console.log("All steps done. Doing final full PR review.")
  const finalSuccess = await runFlowOnPR(octokit, owner, repo, prNumber)
  if (!finalSuccess) {
    console.error("Final full review failed.")
    process.exit(1)
  }

  // 10) Mark the PR “ready for review” or do any final updates
  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      body: "All steps done. PR is ready for final review."
    })
    console.log(`PR #${prNumber} is updated with final body text!`)
  } catch (err) {
    console.error("Failed to update the PR:", err)
  }

  console.log("Workflow complete! See PR for details.")
}

main().catch(err => {
  console.error("Error in master-flow:", err)
  process.exit(1)
})
