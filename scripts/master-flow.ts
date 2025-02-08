/*
scripts/master-flow.ts
----------------------------------------------------------------------
This script is the main orchestration for the entire "multi-step feature" 
workflow in this repo. Typically, it's triggered by the GitHub Actions 
workflow in `.github/workflows/ai-agent.yml`.

Process Outline:
 1) Validate environment variables (FEATURE_REQUEST, GITHUB_TOKEN, etc.).
 2) Determine a unique feature branch name (like `agent/20250101_1530`).
 3) Switch to that branch (create if needed).
 4) Plan the feature steps (using the Planner Agent).
 5) For each step:
    a) Generate code changes (Text-to-Feature).
    b) Apply them locally.
    c) Commit & push.
    d) Optionally do a partial code review/test with `runFlowOnLatestCommit`.
 6) After all steps, run a final full PR review/test with `runFlowOnPR`.
    - If successful, we can mark the PR as ready.
----------------------------------------------------------------------*/

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
  // 1) Check environment variables
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

  // 2) Generate a date/time-based branch name, e.g., agent/20250101_1530
  const now = new Date()
  const dateStr =
    now.toISOString().replace(/[-:T]/g, "").slice(0, 8) +
    "_" +
    now.toTimeString().slice(0, 5).replace(":", "")
  const branchName = `agent/${dateStr}`

  // 3) Switch/create the agent branch locally from main
  switchToFeatureBranch(branchName)

  // 4) Run the Planner Agent to break down the feature request into steps
  console.log(`\n--- Planning steps for: "${featureRequest}" ---\n`)
  const steps = await runPlanner(featureRequest)
  if (!steps.length) {
    console.log("Planner returned no steps. Exiting.")
    process.exit(0)
  }

  // 5) We'll keep track of all changes so the LLM sees them in subsequent steps
  let accumulatedChanges: FileChange[] = []

  // 6) Implement the FIRST step so the branch isn't empty, then open a PR
  {
    const step = steps[0]
    console.log(`\n--- Step 1: ${step.stepName} ---\n`)

    const newChanges = await getFileChangesForStep(step, accumulatedChanges)
    applyFileChanges(newChanges)

    // Merge them into the accumulated changes
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

    // Partial code review on just the new commit
    await runFlowOnLatestCommit(octokit, owner, repo, prNumber)

    // 7) If there are more steps, handle them similarly
    for (let i = 1; i < steps.length; i++) {
      const step: Step = steps[i]
      console.log(`\n--- Step ${i + 1}: ${step.stepName} ---\n`)

      // Ask the LLM for file changes
      const stepChanges = await getFileChangesForStep(step, accumulatedChanges)
      applyFileChanges(stepChanges)

      // Update our local record of changes
      for (const sc of stepChanges) {
        accumulatedChanges = accumulatedChanges.filter(a => a.file !== sc.file)
        accumulatedChanges.push(sc)
      }

      commitChanges(`Step ${i + 1}: ${step.stepName}`)

      // Partial code review for each commit
      await runFlowOnLatestCommit(octokit, owner, repo, prNumber)
    }

    // 8) Once all steps are done, run the final full PR review/test
    console.log("\nAll steps done. Now doing final full PR review/test pass.\n")
    const finalSuccess = await runFlowOnPR(octokit, owner, repo, prNumber)
    if (!finalSuccess) {
      console.error("Final full review/test pass failed.")
      process.exit(1)
    }

    // 9) Optionally update PR body to indicate it's ready
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
