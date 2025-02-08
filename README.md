# Level 4 Agent – Text-to-Feature Agent

This repository demonstrates a **Level 4 AI Agent** that plans and implements a feature in multiple steps, automatically performing code review, test generation, and iterative fixes _per commit_ (partial review), and then a final full review at the end.

Find a full tutorial [here](https://www.jointakeoff.com/courses/series-5-levels-of-agents-coding-agents) on Takeoff.

---

## How It Works

1. **Manual Trigger**

   - A developer or user triggers a [GitHub Actions workflow](.github/workflows/ai-agent.yml) manually from the **Actions** tab, passing in a `feature_request` input describing what they want to build or change.
   - This `feature_request` is the core instruction that the AI uses to plan and implement changes.

2. **AI Planning**

   - The **Planner Agent** (`lib/agents/planner.ts`) processes your `feature_request` and breaks it into an ordered list of steps (e.g., Step1, Step2, etc.).
   - Each step contains:
     - **Name** (for clarity)
     - **Description** (what the step aims to achieve)
     - **Plan** (specific coding actions needed)

3. **Pull Request Initialization**

   - The workflow script (`scripts/master-flow.ts`) checks out the `main` branch locally, creates a new feature branch (e.g., `agent/add-login`) if one doesn’t exist, then opens a pull request from that branch to `main`.
   - By creating a dedicated branch, each code change is pushed there, allowing automatic reviews and comments to be posted to a single PR thread.

4. **Step-by-Step Implementation**

   For each planned step:

   1. **Text-to-Feature** (`lib/agents/text-to-feature.ts`) uses an LLM to propose file changes for that step, referencing the codebase context and any accumulated modifications so far.
   2. The script applies these file changes locally, commits, and pushes.
   3. **Partial AI Review** is performed on just the new commit:
      - We run `runFlowOnLatestCommit(...)`, which uses local git commands to find only the new diff and do a partial code review/test generation/fix loop:
        1. **AI code review** for the latest commit’s changes.
        2. **Test gating & test generation** if needed for the new/modified code.
        3. **Local test run** (`npm run test`). If failing, the agent attempts iterative fixes (up to 3 times).
      - If everything passes, we proceed to the next step. Otherwise, the workflow fails early.

5. **Final Full Review**

   - After all steps pass, we do one last **full** AI review/test cycle on the entire PR:
     1. Build a **full PR context** (diff from `main` to the current branch).
     2. The AI agent conducts a **complete** code review, test gating, test generation, and iterative fix cycle for the entire set of changes.
     3. If tests eventually pass, success! Otherwise, the workflow fails.

6. **Ready for Review**

   - If the final full review/test cycle is successful, the script marks the PR as “ready for review.”
   - At this point, the new feature is available in the PR for final human checks and merging.

---

## File & Folder Breakdown

- **`.github/workflows/ai-agent.yml`**  
  Defines the GitHub Actions workflow. Manually triggered with a `feature_request` describing the desired feature.

  - Installs dependencies and runs `scripts/master-flow.ts`.

- **`scripts/master-flow.ts`**  
  The main script orchestrating the entire “plan → partial commit steps → final review” flow.

  1. Switch/create a feature branch.
  2. Open or find an existing PR.
  3. Run the **Planner Agent** to get a list of steps.
  4. For each step:
     - Ask **Text-to-Feature** to propose changes.
     - Commit/push them.
     - Call **`runFlowOnLatestCommit`** to do a partial code review/test generation/fix loop on just that commit.
  5. After all steps, calls **`runFlowOnPR`** for the final, all-inclusive review/test pass.
  6. If successful, updates the PR to signal that it’s ready for final human review.

- **`lib/agents/planner.ts`**

  - **Planner Agent** that reads the `feature_request` and splits it into a multi-step plan.

- **`lib/agents/text-to-feature.ts`**

  - Takes a single step’s instructions plus any previous modifications and returns new or updated file contents.
  - Commits these changes to the feature branch locally.

- **`lib/agents/commit-step-flow.ts`**

  - Exposes `runFlowOnLatestCommit(...)` for partial code reviews and potential fixes of only the latest commit’s changes.

- **`lib/agents/pr-step-flow.ts`**

  - Exposes `runFlowOnPR(...)`, handling a **full** pass over all changes in the branch (final review stage).

- **`lib/agents/pr-context.ts`**

  - Defines how we build or parse a “Pull Request Context” from local git diffs (base..HEAD), storing the changed files and commit messages.
  - The final pass uses the entire PR diff, while partial passes only handle the latest commit.

- **`lib/agents/test-*.ts`**

  - Handles test logic: gating (deciding whether new tests are needed), proposals (generating new tests), and fixes (iterating if they fail).

- **`lib/agents/code-review.ts`**

  - Orchestrates the AI-based code review. Summaries, file analyses, suggestions are posted on the PR.

- **`lib/agents/test-runner.ts`**
  - Runs `npm run test` locally, capturing Jest output to see if tests pass or fail.

---

## Usage

1. **Set up environment variables**

   - Copy `.env.example` to `.env.local`. Provide your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
   - (Optional) Define `LLM_PROVIDER` as `"openai"` or `"anthropic"` to choose your model.

2. **Trigger the Workflow**

   - Go to **Actions** → **AI Agent Flow (Manual)** → **Run workflow**.
   - Provide a `feature_request` describing the feature/change you want.

3. **Observe the Workflow**

   - The workflow logs show how the AI planner breaks your request into steps.
   - Each step commits partial changes with an AI-based review and test generation/fix cycle.
   - After the final step, a full suite test is run, and if it passes, the PR is declared “ready for review.”

4. **Check the Pull Request**

   - In GitHub’s Pull Requests tab, you’ll see a new PR from `agent/<feature>` to `main`.
   - The AI posts comments about code review and test generation for each commit, plus a final summary.
   - Merge when you’re satisfied, or continue normal development.

---

## FAQ

**Q**: Why partial reviews each step?  
**A**: This allows the AI to focus specifically on newly added changes, making it easier to isolate issues incrementally instead of dealing with a large final diff all at once.

**Q**: Why a final full PR pass?  
**A**: Ensures comprehensive coverage and prevents discrepancies where individually passing steps could conflict collectively.

**Q**: Can I do more than 3 fix iterations?  
**A**: Yes. In the code (e.g., `pr-step-flow.ts` or `commit-step-flow.ts`), change `const maxIterations = 3` to any number you prefer.

**Q**: What if I need the entire file content for partial commits?  
**A**: Currently, partial commits rely on local `git diff`. If full file context is needed, you can customize `compareCommitsForPR(...)` or similar logic to retrieve complete files.

---

**Enjoy building your multi-step AI agent workflow!**
