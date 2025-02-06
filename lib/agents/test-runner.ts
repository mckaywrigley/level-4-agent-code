/**
 * This module runs the local Jest tests within the GitHub Actions environment
 * and returns whether they passed or failed, plus the output logs.
 *
 * We do this so that if tests fail, the AI can attempt to fix them and try again.
 */

import { execSync } from "child_process"

/**
 * runLocalTests:
 * - Executes "npm run test" (which calls Jest based on our package.json scripts).
 * - If tests fail, we catch the error and store the output for debugging.
 *
 * Returns:
 *  - jestFailed: boolean indicating whether the tests failed
 *  - output: the test output logs (pass/fail messages, stack traces, etc.)
 */
export function runLocalTests(): { jestFailed: boolean; output: string } {
  let jestFailed = false
  let output = ""

  try {
    // We sync execute the test command. If any test fails, an error is thrown.
    output = execSync("npm run test", { encoding: "utf8" })
  } catch (err: any) {
    jestFailed = true
    // Capture the standard output or error message
    output = err.stdout || err.message || "Unknown error"
  }

  return { jestFailed, output }
}
