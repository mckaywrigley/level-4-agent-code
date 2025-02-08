/*
scripts/master-flow.ts

This script orchestrates the entire multi-step AI feature workflow:
1) Switch/create the agent/<timestamp> branch from main.
2) Open/find a PR from that branch to main.
3) Run the Planner Agent to break down the feature request into steps.
4) For each step:
   - Generate code changes (Text-to-Feature).
   - Commit them.
   - Run a partial code review pass (runFlowOnLatestCommit) to post a comment
     about the changes — but *do not* run or fix tests at each step.
5) After all steps, run runFlowOnPR which *does* the full code review,
   plus test gating, test generation, and iterative test fixing.
6) If that final pass succeeds, mark the PR as ready for review.
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
  // 1) Check for required environment variables
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

  // 2) Generate a date/time-based branch name: "agent/20250101_1530"
  const now = new Date()
  const dateStr =
    now.toISOString().replace(/[-:T]/g, "").slice(0, 8) +
    "_" +
    now.toTimeString().slice(0, 5).replace(":", "")
  const branchName = `agent/${dateStr}`

  // 3) Switch/create the agent branch locally, from main
  switchToFeatureBranch(branchName)

  // 4) Run the Planner Agent to break down the feature request into steps
  console.log(`\n--- Planning steps for: "${featureRequest}" ---\n`)
  const steps = await runPlanner(featureRequest)

  if (!steps.length) {
    console.log("Planner returned no steps. Exiting.")
    process.exit(0)
  }

  // 5) Accumulate changes so the LLM sees them in subsequent steps
  let accumulatedChanges: FileChange[] = []

  // 6) Generate and commit the FIRST step so that branch isn't empty
  {
    const step = steps[0]
    console.log(`\n--- Step 1: ${step.stepName} ---\n`)

    const newChanges = await getFileChangesForStep(step, accumulatedChanges)
    applyFileChanges(newChanges)

    // Save them to accumulated
    for (const nc of newChanges) {
      accumulatedChanges = accumulatedChanges.filter(a => a.file !== nc.file)
      accumulatedChanges.push(nc)
    }

    commitChanges(`Step 1: ${step.stepName}`)

    // Now that we have at least one commit, open/find the PR
    const prNumber = await ensurePullRequest(
      octokit,
      owner,
      repo,
      branchName,
      featureRequest
    )
    console.log(`PR #${prNumber} created/found.`)

    // Partial code review (no tests/fixes) for this first step
    await runFlowOnLatestCommit(octokit, owner, repo, prNumber)

    // 7) If there are more steps, handle them
    for (let i = 1; i < steps.length; i++) {
      const step: Step = steps[i]
      console.log(`\n--- Step ${i + 1}: ${step.stepName} ---\n`)

      // Ask the LLM for file changes
      const stepChanges = await getFileChangesForStep(step, accumulatedChanges)
      applyFileChanges(stepChanges)

      // Update our local record
      for (const sc of stepChanges) {
        accumulatedChanges = accumulatedChanges.filter(a => a.file !== sc.file)
        accumulatedChanges.push(sc)
      }

      // Commit & push
      commitChanges(`Step ${i + 1}: ${step.stepName}`)

      // Partial code review (no tests/fixes)
      await runFlowOnLatestCommit(octokit, owner, repo, prNumber)
    }

    // 8) Once all steps are done, run the final full PR flow with test gating/fixes
    console.log("\nAll steps done. Now doing final full PR review/test pass.\n")
    const finalSuccess = await runFlowOnPR(octokit, owner, repo, prNumber)
    if (!finalSuccess) {
      console.error("Final full review/test pass failed.")
      process.exit(1)
    }

    // 9) Mark the PR as updated/final
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
}

main().catch(err => {
  console.error("Error in master-flow:", err)
  process.exit(1)
})
