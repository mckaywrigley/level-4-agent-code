/**
 * This module runs local Jest tests in the GitHub Action environment.
 * No changes needed regarding local vs remote.
 */

import { execSync } from "child_process"

export function runLocalTests(): { jestFailed: boolean; output: string } {
  let jestFailed = false
  let output = ""

  try {
    output = execSync("npm run test", {
      encoding: "utf8",
      stdio: ["inherit", "pipe", "pipe"]
    }).toString()
  } catch (err: any) {
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
