/**
 * This script is the main entry point for our AI Agent workflow.
 * - It imports the runFlow function from our flow-runner.ts file.
 * - When run, it calls runFlow(), which orchestrates the entire AI-based code review and test generation process.
 * - If anything errors out during execution, it logs the error and exits the process with a non-zero code.
 */

import { runFlow } from "@/lib/agents/flow-runner"

// Initiates the AI Agent flow.
runFlow().catch(err => {
  console.error("Error in ai-flow:", err)
  process.exit(1)
})
