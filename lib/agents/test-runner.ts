/**
 * test-runner.ts
 * --------------------------------------------------------------------
 * This module programmatically runs local Jest tests. We do so by
 * running `npm run test` as a child process. If the tests fail,
 * we capture and return the output so the AI can see what failed
 * and attempt to fix it in an iterative loop.
 * --------------------------------------------------------------------
 */

import { execSync } from "child_process"

/**
 * runLocalTests:
 * ------------------------------------------------------------------
 * 1) Executes `npm run test` in a child process.
 * 2) If it fails, we catch the error, parse the stdout and stderr,
 *    and return them for debugging or for the AI to fix.
 *
 * @returns { jestFailed, output }
 *   - jestFailed: boolean indicating if tests failed
 *   - output: console output from the test run
 */
export function runLocalTests(): { jestFailed: boolean; output: string } {
  let jestFailed = false
  let output = ""

  try {
    // 'stdio' set to 'inherit' for input, 'pipe' for output.
    output = execSync("npm run test", {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"]
    }).toString()
  } catch (err: any) {
    // If tests failed, store the info
    jestFailed = true
    output = err.stdout?.toString() || ""
    if (err.stderr) {
      output += "\n" + err.stderr.toString()
    }
    if (!output) {
      output = err.message || "Unknown error"
    }
  }

  return { jestFailed, output }
}
