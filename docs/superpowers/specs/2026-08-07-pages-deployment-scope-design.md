# Pages Deployment Scope Design

## Goal

Keep CMS article publishing automatic while avoiding GitHub Pages deployments for documentation-only changes and avoiding a prolonged second deployment attempt after a failure.

## Chosen Approach

The Pages workflow will retain its `push` trigger for the `master` and `main` branches, but add an inclusive `paths` filter. A push runs the workflow only when it can change the generated site:

- `src/**` for Astro source and CMS Markdown posts.
- `public/**` for static assets and the Decap CMS configuration.
- Build and deployment inputs: `astro.config.*`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tailwind.config.*`, `tsconfig.json`, and `.github/workflows/deploy.yml`.

Documentation files such as `README.md` and `docs/**` are intentionally excluded. `workflow_dispatch` remains available so an administrator can deploy the current branch manually from GitHub.

The deployment job will use one `actions/deploy-pages@v4` step. The previous conditional second attempt is removed. This cannot prevent GitHub Actions from failing before a job starts while downloading an action, but it prevents a Pages service failure from waiting through a second long attempt.

## Alternatives Considered

1. Deploy on every push: simplest configuration, but continues to deploy documentation-only changes.
2. Require all deployments to be manually started: avoids background work, but CMS posts no longer go live after publishing.
3. Selected: deploy only site-affecting paths and allow manual dispatch: preserves CMS publishing while reducing unnecessary runs.

## Error Handling

If GitHub itself cannot initialize a runner or download an action, the workflow fails without reaching project code. The GitHub Actions UI's `Re-run all jobs` remains the recovery action. If the site builds and the single Pages deployment step fails, the task finishes as failed instead of making another automatic attempt.

## Verification

The existing Node test suite will be updated to parse the workflow YAML and assert all of the following:

- CMS post paths are included in the push trigger.
- Documentation-only paths are not included.
- Manual dispatch remains enabled.
- The deployment job has exactly one Pages deployment step and no retry condition.

The complete CMS test command and production build command will run after the workflow edit.
