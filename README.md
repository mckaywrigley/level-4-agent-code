# Level 3 Agent – Iterative Code Review + Test Generation

A Level 3 AI Agent that listens for a Pull Requests, generates a code review, and then generates tests for the code based on the PR. If the tests don't pass, it will iteratively generate corrected tests until they pass.

Find a full tutorial [here](https://www.jointakeoff.com/courses/series-5-levels-of-agents-coding-agents) on Takeoff.

**TL;DR**  
This AI Agent:

1. Watches for Pull Requests.
2. Posts an automatic code review (with suggestions and file analyses).
3. Generates new or updated tests based on the PR changes.
4. Runs tests locally.
5. If they fail, it iterates up to 3 times, attempting to fix the tests each time.

When all tests pass, it posts a success message. If the tests still fail after all attempts, the agent marks the process as failed.

---

## How It Works

### 1. Trigger on Pull Request

- The GitHub Actions workflow (`.github/workflows/ai-agent.yml`) runs whenever a Pull Request is opened or updated against the `main` branch.

### 2. Code Checkout & Setup

- The workflow checks out your code and installs dependencies (`npm ci`).
- It runs our `scripts/ai-flow.ts` file (the “brain” of the AI process).

### 3. Code Review Phase

- The agent fetches the PR’s changed files, commit messages, and other context.
- It asks a Large Language Model (LLM) to provide a structured JSON review (summary, file-by-file analysis, overall suggestions).
- The AI Agent posts a PR comment containing this review.

### 4. Test Generation Phase (If Needed)

- The agent checks whether it should generate new tests or update existing ones, based on the PR changes and any existing tests.
- If it decides tests are needed, it calls the LLM again, requesting new or updated test files in strict JSON format (e.g., `__tests__/unit/AboutPage.test.tsx`).
- The AI Agent then commits these generated tests back to the pull request branch.

### 5. Local Test Run

- With new or updated tests in place, the AI Agent runs Jest tests locally inside the GitHub Actions environment (`npm run test`).

### 6. Iterative Fixing (Up to 3 Attempts)

- If tests fail, the AI Agent collects the error output and asks the LLM to produce a fix (new or refined test files).
- It commits these fixes, then re-runs tests.
- It will repeat this up to 3 times if failures continue.

### 7. Success or Failure

- If tests eventually pass, the AI Agent updates its PR comment with a success message.
- If the tests still fail after 3 iterations, the AI Agent posts that it could not fix the issues and marks the process as failed.

---

## Files & Folders of Interest

- **`.github/workflows/ai-agent.yml`**  
  The GitHub Actions workflow that triggers on pull requests, checks out code, installs dependencies, and calls our AI script.

- **`scripts/ai-flow.ts`**  
  The main script that starts the entire agent flow. It calls into the various helper modules.

- **`lib/agents/`**  
  Contains the modules that handle different steps in the process:
  - **`flow-runner.ts`** – Orchestrates the entire AI flow (review, test generation, iterative fixing).
  - **`code-review.ts`** – Gathers PR changes and requests a code review from the LLM.
  - **`test-proposals.ts`** – Requests new/updated tests and commits them to GitHub.
  - **`test-fix.ts`** – Gathers test failure logs and tries to fix the tests by prompting the LLM again.
  - **`test-runner.ts`** – Runs tests locally (`npm run test`) and captures output.
  - **`test-gating.ts`** – Determines if test generation is needed or can be skipped.
  - **`github-comments.ts`** – Creates and updates PR comments.
  - **`pr-context.ts`** – Pulls important PR data (changed files, commit messages, etc.).
  - **`llm.ts`** – Chooses which AI provider to use (OpenAI, Anthropic, etc.) based on environment variables.

---

## Getting Started

1. **Set up your environment variables**:

   - Copy `.env.example` to `.env.local`.
   - Add your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
   - Optionally set `LLM_PROVIDER` to `"openai"` or `"anthropic"`.

2. **Push or Open a Pull Request**:

   - The workflow triggers automatically when you push changes to a branch and open or update a PR against `main`.

3. **Watch the Magic**:
   - Go to the PR on GitHub.
   - You’ll see an initial comment saying the AI Agent is starting.
   - Moments later, it updates that comment with a code review.
   - Then the Agent decides if it needs to create or fix tests. If so, it commits those tests, runs them, and iterates as necessary.

---

## FAQ

**Q: What if I already have tests?**  
A: The Agent looks at your existing tests (files under `__tests__`) and only creates or updates what’s missing or broken.

**Q: How do I control which files get included in the prompt?**  
A: See `pr-context.ts`. By default, large files or lock files (like `package-lock.json`) are excluded from the AI’s prompt.

**Q: Can I customize the LLM or the model it uses?**  
A: Yes! Modify environment variables like `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `LLM_MODEL` for further customization.

**Q: How can I skip the test generation?**  
A: The Agent’s “gatingStep” checks if new tests are necessary. If you prefer to always generate tests (or never), adjust the logic in `test-gating.ts`.
