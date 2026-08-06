# Pages Deployment Scope Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with a test-first cycle.

**Goal:** Keep CMS article publishing automatic while preventing documentation-only pushes and long automatic deployment retries.

**Architecture:** Restrict the existing GitHub Pages push trigger with an inclusive `paths` list, retain `workflow_dispatch`, and reduce the deploy job to one Pages deployment action. Extend the existing Node test to enforce these workflow contracts.

**Tech Stack:** GitHub Actions YAML, Node.js built-in test runner, `yaml` parser, pnpm, Astro.

## Global Constraints

- CMS posts under `src/content/posts/**` must trigger deployment.
- `README.md` and `docs/**` must not trigger deployment.
- Manual `workflow_dispatch` must remain available.
- The deploy job must contain exactly one `actions/deploy-pages@v4` step.

### Task 1: Lock workflow behavior with tests

**Files:**
- Modify: `tests/cms-config.test.mjs`
- Test: `tests/cms-config.test.mjs`

- [ ] Add a test that parses `.github/workflows/deploy.yml`, checks the push branches, required site-affecting paths, absence of README/docs paths, and `workflow_dispatch`.
- [ ] Add assertions that only one Pages deployment step exists and it has no retry condition or `continue-on-error`.
- [ ] Run `pnpm run test:cms`; confirm the new assertions fail against the current workflow because it has no path filter and two deploy steps.

### Task 2: Simplify the Pages workflow

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] Add the approved `paths` list to the push trigger while retaining `main`, `master`, and `workflow_dispatch`.
- [ ] Remove the retry deployment step, retry-specific environment URL expression, and final retry failure step.
- [ ] Keep the first deployment step as a single `actions/deploy-pages@v4` invocation with the existing 600000 ms timeout and error count.
- [ ] Run `pnpm run test:cms`; confirm all workflow contract tests pass.

### Task 3: Verify the full site

**Files:**
- No additional files.

- [ ] Run `pnpm run test:cms` and confirm 0 failures.
- [ ] Run `pnpm build` and confirm exit code 0.
- [ ] Run `git diff --check` and inspect the final diff before any push.

