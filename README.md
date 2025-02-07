# Level 4 Agent – Multi-Step Feature Implementation with Partial & Full AI Review

This repository demonstrates a **Level 4 AI Agent** that plans and implements a feature in multiple steps, automatically performing code review, test generation, and iterative fixes _per commit_ (partial review), and then a final full review at the end.

Find a full tutorial [here](https://www.jointakeoff.com/courses/series-5-levels-of-agents-coding-agents) on Takeoff.

## How It Works

### 1. Manual Trigger

- A developer or user triggers a [GitHub Actions workflow](.github/workflows/ai-agent.yml) manually from the **Actions** tab, passing in a `feature_request` input describing what they want to build or change.

### 2. AI Planning

- The **Planner Agent** (`lib/agents/planner.ts`) reads your `feature_request` and breaks it into an ordered list of steps (e.g., Step1, Step2, etc.).
- Each step has a short description and a plan for the coding changes needed.

### 3. Draft Pull Request

- The workflow script (`scripts/master-flow.ts`) checks out the `main` branch locally, creates a new feature branch (e.g., `agent/add-login`) if one doesn’t exist, then opens a **draft** pull request from that branch → `main`.
- All subsequent changes are pushed to this branch, so we can attach AI reviews to the PR.

### 4. Step-by-Step Implementation

For each step in the plan:

1. **Text-to-Feature** (`lib/agents/text-to-feature.ts`) uses an LLM to propose file changes for that step, based on prior context (i.e., the changes so far).
2. The script applies these file changes locally, commits, and pushes.
3. **Partial AI Review**:
   - We run `runFlowOnLatestCommit(...)`, which uses a “compare commits” approach to find only the new diff from the last commit and do a partial code review/test generation/fix loop on that commit:
     1. AI code review for the latest commit’s changes.
     2. Test gating & test generation for the new/modified files.
     3. Local test run (`npm run test`). If failing, we do an iterative fix loop up to 3 times.
   - If everything passes, we proceed to the next step. Otherwise, we fail early.

### 5. Final Full Review

- After all steps pass, we do one last **full** AI review/test cycle:
  1. We build a full PR context including _all_ changes from this feature branch.
  2. The AI Agent does a complete code review, test gating, test generation, and iterative fix cycle again, this time on the entire set of changes.
  3. If we pass, success! If not, we fail the workflow.

### 6. Ready for Review

- If the final full review/test cycle is successful, we mark the PR as “ready for review” by removing the draft status.
- At this point, the new feature is available in the PR for final human checks and merging.

---

## File & Folder Breakdown

- **`.github/workflows/ai-agent.yml`**  
  Defines the GitHub Actions workflow. Manually triggered with an input `feature_request`.

  - Installs dependencies and runs `scripts/master-flow.ts`.

- **`scripts/master-flow.ts`**  
  The main script orchestrating the entire “plan → partial commit steps → final review” flow.

  1. Switches/creates a new feature branch.
  2. Ensures a draft PR is open.
  3. Runs the **Planner Agent** to get steps.
  4. For each step:
     - Asks **Text-to-Feature** to propose changes.
     - Commits/pushes them.
     - Calls **`runFlowOnLatestCommit`** to do partial code review/test generation/fix.
  5. After all steps, calls **`runFlowOnPR`** for a final full PR-based review/test pass.
  6. If successful, marks the PR as non-draft.

- **`lib/agents/planner.ts`**  
  Planner Agent that takes your feature request and breaks it into steps.

- **`lib/agents/text-to-feature.ts`**  
  Takes a single step’s description and the “accumulated changes,” returning new or updated file contents. Commits these to the feature branch.

- **`lib/agents/commit-step-flow.ts`** (example name)  
  Exposes `runFlowOnLatestCommit(...)`, which:

  1. Compares HEAD~1 to HEAD to get the new commit’s diff.
  2. Builds a partial context for that commit.
  3. Runs code review, gating, test generation, iterative fix, etc. but only on that commit’s changes.

- **`lib/agents/pr-step-flow.ts`**  
  Exposes `runFlowOnPR(...)`, a more standard approach that sees the entire PR’s changes. Used for the final “full” pass.

- **`lib/agents/pr-context.ts`**  
  Defines how we gather PR data (files changed, commit messages). The final pass uses the entire PR. For partial commits, we do a custom “compareCommitsForPR(...)” approach.

- **`lib/agents/test-*.ts`** (test gating, test proposals, test fix)  
  Handles test-related logic: deciding if tests are needed, generating them, or iteratively fixing failing tests.

- **`lib/agents/code-review.ts`**  
  Orchestrates the AI-based code review step.

- **`lib/agents/test-runner.ts`**  
  Runs `npm run test` locally, capturing the output to see if tests pass or fail.

---

## Usage

1. **Set up environment variables**

   - Copy `.env.example` to `.env.local`. Provide your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.
   - Optionally define `LLM_PROVIDER` (`openai` or `anthropic`).

2. **Trigger the Workflow**

   - Go to **Actions** → **AI Agent Flow (Manual)** → **Run workflow**.
   - Provide a `feature_request` describing what you want built/changed.

3. **Observe the Workflow**

   - The workflow logs show the AI planner’s steps.
   - For each step, you’ll see partial code diffs committed.
   - The partial code review/test generation/fix runs in the logs.
   - After all steps, a final full pass is done. If everything passes, the PR is marked ready for review.

4. **Check the Draft PR**
   - GitHub’s Pull Requests section will show a draft PR from `agent/<feature>` to `main`.
   - You can watch as the AI posts “AI Code Review” and “AI Test Generation” comments for each step’s commit, plus for the final pass.
   - If you’re happy, you can merge or continue normal dev.

---

## FAQ

**Q**: Why partial reviews each step?  
**A**: So the AI logic can specifically focus on new changes from each step, rather than re-reviewing the entire PR each time.

**Q**: Why a final full PR pass?  
**A**: Ensures everything is tested together, preventing surprises where steps pass individually but break collectively.

**Q**: Can I do more than 3 fix iterations?  
**A**: Yes, modify `const maxIterations = 3` in the flows to your preferred limit.

**Q**: Do I have to keep the PR as a draft at first?  
**A**: Not necessarily. Draft mode is just a nice way to show “work in progress.” You could open a normal PR if you prefer.

**Q**: What if I need the full file contents for partial commits?  
**A**: By default, we only fetch partial diffs. If you need the entire content, adapt the logic in `compareCommitsForPR(...)` to fetch file contents similarly to `buildPRContext`.

---

Enjoy the multi-step AI agent workflow!
