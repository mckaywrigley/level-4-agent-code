/*
<ai_context>
This script orchestrates the AI pipeline for a user-provided feature request.
Now, after each step's code changes are committed, we run the "pr-based AI flow"
logic on a *draft PR*. This ensures each step gets an AI code review + test generation
+ iterative test fixing, just like we previously did on normal pull requests.

Finally, after all steps pass, we run one last check and then open the PR fully.
</ai_context>
*/

import { runFlowOnLatestCommit } from "@/lib/agents/commit-step-flow"
import { runPlanner } from "@/lib/agents/planner"
import { runFlowOnPR } from "@/lib/agents/pr-step-flow"
import {
  applyFileChanges,
  commitChanges,
  ensureDraftPullRequest,
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

  // 1) Create or switch to the agent/<safeName> branch
  const safeName = featureRequest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const branchName = `agent/${safeName}`
  switchToFeatureBranch(branchName)

  // 2) Create or find a draft PR (so we can do a PR-based AI flow each step)
  const draftPRNumber = await ensureDraftPullRequest(
    octokit,
    owner,
    repo,
    branchName,
    featureRequest
  )
  console.log(`Draft PR #${draftPRNumber} created/found.`)

  // 3) Plan out steps using the Planner
  console.log("Planning steps for:", featureRequest)
  const steps = await runPlanner(featureRequest)

  // 4) We'll keep track of all changes made so far
  let accumulatedChanges: FileChange[] = []

  // 5) For each step, do the usual: generate changes, commit, run AI PR flow
  for (let i = 0; i < steps.length; i++) {
    const step: Step = steps[i]
    console.log(`\n--- Step ${i + 1}: ${step.stepName} ---\n`)

    // 5a) Generate changes for this step, passing in the "accumulatedChanges"
    //     so the LLM can see what's already changed.
    const newChanges = await getFileChangesForStep(step, accumulatedChanges)
    console.log(
      "Proposed file changes:",
      newChanges.map(c => c.file)
    )

    // 5b) Apply them locally & commit
    applyFileChanges(newChanges)
    commitChanges(`Step ${i + 1}: ${step.stepName}`)

    // 5c) Update our local record of "accumulatedChanges"
    //     If the LLM re-writes a file that already existed in the array, you may want
    //     to remove the old version. We do a simple approach below:
    for (const c of newChanges) {
      // remove prior entry for the same file
      accumulatedChanges = accumulatedChanges.filter(ac => ac.file !== c.file)
      // add the new content
      accumulatedChanges.push(c)
    }

    // 5d) Run the full PR-based AI flow on the new commit
    const success = await runFlowOnLatestCommit(
      octokit,
      owner,
      repo,
      draftPRNumber
    )
    if (!success) {
      console.error(`Tests failed on step ${i + 1}`)
      process.exit(1)
    }
  }

  // 6) After all steps pass, do a final check
  console.log("All steps done. Doing final full PR review.")
  const finalSuccess = await runFlowOnPR(octokit, owner, repo, draftPRNumber)
  if (!finalSuccess) {
    console.error("Final full review failed.")
    process.exit(1)
  }

  // 7) Mark PR as ready for review
  try {
    await octokit.pulls.update({
      owner,
      repo,
      pull_number: draftPRNumber,
      draft: false
    })
    console.log(`PR #${draftPRNumber} is now ready for review!`)
  } catch (err) {
    console.error("Failed to un-draft the PR:", err)
    // We won't fail the pipeline here
  }
}

main().catch(err => {
  console.error("Error in master-flow:", err)
  process.exit(1)
})
