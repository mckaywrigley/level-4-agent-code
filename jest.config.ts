/*
<ai_context>
This file contains the configuration for Jest.
</ai_context>
*/

import type { Config } from "jest"
import nextJest from "next/jest.js"

// nextJest helps integrate Jest with Next.js properly
const createJestConfig = nextJest({ dir: "./" })

// Define the Jest configuration object
const config: Config = {
  // Use 'v8' coverage provider for speed and native integration
  coverageProvider: "v8",

  // Specify where coverage reports will be saved
  coverageDirectory: "reports/jest/coverage",

  // Use 'jsdom' to emulate a browser environment for tests that need the DOM
  testEnvironment: "jsdom",

  // Mapping for module imports, allowing '@/' style imports
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },

  // Reporters define how test results are presented
  reporters: [
    "default",
    [
      "jest-junit",
      {
        outputDirectory: "reports/jest",
        outputName: "test-results.xml"
      }
    ]
  ],

  // This config searches for test files in the __tests__/unit directory
  // that end in .test.ts or .test.tsx
  testMatch: [
    "<rootDir>/__tests__/unit/**/*.test.ts",
    "<rootDir>/__tests__/unit/**/*.test.tsx"
  ]
}

// Export the configuration wrapped with Next.js-specific adjustments
export default createJestConfig(config)
