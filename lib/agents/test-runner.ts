/**
 * This module runs local Jest tests in the GitHub Action environment.
 * No changes needed regarding local vs remote.
 */

import { execSync } from "child_process"

export function runLocalTests(): { jestFailed: boolean; output: string } {
  let jestFailed = false
  let output = ""

  try {
    output = execSync("npm run test", { encoding: "utf8" })
  } catch (err: any) {
    jestFailed = true
    output = err.stdout || err.message || "Unknown error"
  }

  return { jestFailed, output }
}
