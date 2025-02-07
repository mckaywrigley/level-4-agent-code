/*
<ai_context>
This script orchestrates the AI pipeline for a user-provided feature request.
It uses:
  - Planner Agent -> to break down the request into steps.
  - Text-to-Feature Agent -> to generate and apply file changes for each step.
  - runLocalFlow -> to test after each step.
Finally, if all steps pass, we do a final test run and open a Pull Request.
</ai_context>
*/

import { runLocalFlow } from "@/lib/agents/flow-runner"
import { runPlanner } from "@/lib/agents/planner"
import {
  applyFileChanges,
  commitChanges,
  getFileChangesForStep,
  switchToFeatureBranch
} from "@/lib/agents/text-to-feature"
import { Octokit } from "@octokit/rest"

async function main() {
  const featureRequest = process.env.FEATURE_REQUEST
  if (!featureRequest) {
    console.error("Missing FEATURE_REQUEST environment variable.")
    process.exit(1)
  }

  // Generate a sanitized branch name from the user’s request
  const safeName = featureRequest
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const branchName = `agent/${safeName}`

  // Switch to or create the feature branch
  switchToFeatureBranch(branchName)

  // 1) Use the Planner Agent to break down the feature request into steps
  console.log("Planning steps for feature:", featureRequest)
  const steps = await runPlanner(featureRequest)
  console.log("Received plan:", steps)

  // 2) Loop over each planned step
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    console.log(`\n--- Step ${i + 1}: ${step.title} ---\n`)

    // 2a) Call the "Text-to-Feature" agent to get the file changes
    const changes = await getFileChangesForStep(step.description)
    console.log(
      "Proposed file changes:",
      changes.map(c => c.file)
    )

    // 2b) Apply changes locally
    applyFileChanges(changes)

    // 2c) Commit and push those changes
    commitChanges(`Step ${i + 1}: ${step.title}`)

    // 2d) Run local tests & fix attempts
    const passed = runLocalFlow()
    if (!passed) {
      console.error(`Stopping due to failed tests in step ${i + 1}.`)
      process.exit(1)
    }
  }

  // 3) After all steps have succeeded, do a final test check
  console.log(
    "\nAll steps completed successfully. Running final test check...\n"
  )
  const finalPassed = runLocalFlow()
  if (!finalPassed) {
    console.error("Final check failed.")
    process.exit(1)
  }

  // 4) If everything passes, we open a PR from agent/<feature-name> → main
  try {
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      console.error("No GITHUB_TOKEN found. Skipping PR creation.")
      process.exit(0)
    }

    const repoStr = process.env.GITHUB_REPOSITORY
    if (!repoStr) {
      console.error("No GITHUB_REPOSITORY found. Skipping PR creation.")
      process.exit(0)
    }

    const [owner, repo] = repoStr.split("/")
    const octokit = new Octokit({ auth: githubToken })

    const title = `Feature: ${featureRequest}`
    const body = `This PR implements all steps for: "${featureRequest}".`

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body,
      head: branchName,
      base: "main"
    })

    console.log("Pull Request created:", pr.html_url)
  } catch (err) {
    console.error("Failed to create PR:", err)
    process.exit(0)
  }
}

main().catch(err => {
  console.error("Error running master-flow:", err)
  process.exit(1)
})
