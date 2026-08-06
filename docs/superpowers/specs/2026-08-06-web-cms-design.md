# Web CMS Design

## Goal

Add a zero-cost browser-based CMS to the existing Astro blog so the owner can create, edit, publish, and upload images without manually creating Markdown files or running Git commands.

## Constraints

- Keep the existing GitHub Pages deployment and GitHub Actions workflow.
- Do not introduce a database or paid service.
- Store all article content in the existing Git repository.
- Preserve compatibility with the existing Astro `posts` content collection.
- Provide a Chinese setup and usage guide that teaches the owner how to configure and operate the CMS.
- Never commit OAuth secrets to the repository.

## Selected Approach

Use Decap CMS as a static admin application served at `/admin/`. Configure its GitHub backend to write directly to `James-826/James-826.github.io` on the `main` branch. Use a small GitHub OAuth proxy deployed on Cloudflare Workers' free tier because GitHub Pages cannot safely hold an OAuth client secret.

This keeps the publishing path unchanged:

```text
Browser CMS -> GitHub repository -> GitHub Actions -> GitHub Pages
```

The only new external component is the OAuth proxy. It exchanges GitHub's temporary authorization code for an access token and returns the result to Decap CMS. It does not store posts or user data.

## Alternatives Considered

### Netlify with Git Gateway

This offers a simpler integrated authentication path but changes the site's deployment platform. It was rejected because the project should remain on GitHub Pages and avoid introducing a hosting migration.

### VS Code Front Matter

The repository already includes `frontmatter.json`, so local CMS-style editing is available. It was rejected as the primary solution because it does not provide a browser or mobile publishing experience.

### Custom CMS and API

A custom editor, authentication service, and content API would offer complete control but adds unnecessary code, maintenance, and security risk. It was rejected because Decap CMS already supports the required Git workflow.

## Repository Changes

### CMS Application

Create `public/admin/index.html` as the static CMS entry point. It loads a pinned Decap CMS release from a public CDN and includes appropriate page metadata. Astro copies this directory into the built site, making the CMS available at `https://james-826.github.io/admin/`.

Create `public/admin/config.yml` for the CMS configuration. It will contain:

- GitHub repository: `James-826/James-826.github.io`
- Branch: `main`
- OAuth proxy base URL supplied after the Worker is deployed
- Site and display URLs for the GitHub Pages domain
- Chinese CMS locale
- Direct publishing to the configured branch
- Article collection rooted at `src/content/posts`
- Uploaded media rooted at `public/uploads`
- Public media URL rooted at `/uploads`

The OAuth base URL cannot be known until the user deploys the Worker. The checked-in configuration will use one explicit, documented placeholder value that is guaranteed to fail closed until replaced. The setup guide will identify the exact line to edit.

### Article Model

The CMS article collection will write Markdown files with YAML frontmatter compatible with `src/content/config.ts`:

| Field | CMS widget | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | yes | Article title |
| `published` | datetime | yes | Defaults to the current date |
| `updated` | datetime | no | Last substantial revision |
| `description` | text | no | Listing and metadata summary |
| `image` | image | no | Stored under `public/uploads` and written as `/uploads/...` |
| `tags` | list | no | Multiple free-form tags |
| `category` | select | no | `项目`, `学习笔记`, or `博客` |
| `status` | select | no | Project status values used by the existing project page |
| `repo` | string | no | Project repository URL |
| `draft` | boolean | yes | Defaults to `true` to prevent accidental publication |
| `lang` | select | no | Defaults to `zh_CN` |
| `body` | markdown | yes | Article content |

New file names will use a URL-safe slug entered by the author. Existing top-level Markdown posts remain editable. The existing page-bundle post at `src/content/posts/post-1/index.md` remains valid for Astro but is outside the first CMS iteration because its nested cover-image layout differs from the common top-level post layout. No content is migrated or deleted.

## Publishing Workflow

1. The owner opens `/admin/` and selects GitHub login.
2. Decap redirects through the Cloudflare Worker to GitHub OAuth.
3. GitHub confirms the owner's repository access and returns an authorization code.
4. The Worker exchanges the code and returns the token to the CMS window.
5. The owner creates or edits an article and saves it.
6. Decap commits the Markdown and optional uploaded image to `main`.
7. The existing GitHub Actions workflow builds the Astro site and deploys GitHub Pages.
8. Production builds omit posts whose `draft` value is `true`; switching the field off and saving publishes the article.

Direct publishing is selected instead of an editorial pull-request workflow because this is a single-author personal blog and the goal is minimal friction.

## Authentication and Security

- A GitHub OAuth App provides the client ID and client secret.
- The client ID may appear in public configuration if required by the chosen proxy, but the client secret must exist only as a Cloudflare Worker secret.
- The Worker accepts callbacks only for the configured GitHub Pages admin origin.
- The CMS repository setting is fixed to the owner's repository and branch.
- Only GitHub users with write access to the repository can publish.
- The setup guide includes verification of the OAuth callback URL and an explicit check that secrets are absent from Git history and generated site assets.

## Teaching and Documentation

Update `README.md` with a short "Web CMS" section and add `docs/cms-setup.zh-CN.md` as the complete guide. The guide will cover:

1. Creating a GitHub OAuth App.
2. Deploying the OAuth proxy on Cloudflare Workers' free tier.
3. Adding the client secret with Cloudflare's secret storage.
4. Updating the CMS OAuth URL.
5. Building and pushing the repository changes.
6. Completing the first login.
7. Creating a draft, uploading a cover, previewing, and publishing.
8. Editing or deleting an existing article.
9. Checking GitHub Actions after publication.
10. Troubleshooting callback mismatch, authorization failure, missing images, invalid frontmatter, and failed builds.

The instructions will distinguish clearly between commands that can be run locally and account-level steps that must be completed in GitHub or Cloudflare.

## Error Handling

- Before OAuth is configured, `/admin/` loads but login fails with a documented configuration message; it cannot publish anonymously.
- Invalid required fields are blocked by Decap before commit.
- Drafts default to hidden in production to reduce accidental publishing.
- A failed GitHub Actions build leaves the previous GitHub Pages deployment intact; the guide explains how to open the workflow log and correct the article.
- Unsupported nested page-bundle posts are not silently rewritten by the CMS.

## Verification

Repository-side verification will include:

- A configuration test that parses `public/admin/config.yml` and asserts the repository, branch, collection folder, media paths, required fields, and safe draft default.
- A static page test that verifies `public/admin/index.html` loads the pinned CMS script and references the configuration convention.
- `pnpm check` to validate Astro and TypeScript.
- `pnpm build` to confirm the CMS files are copied into `dist/admin/` and existing content still builds.
- A secret scan for common OAuth secret patterns in tracked and generated files.

End-to-end GitHub login cannot be completed until the user creates the OAuth App and Worker. The guide will provide a manual acceptance checklist for that final external verification.

## Success Criteria

- `/admin/` is present in the production build.
- The owner can sign in with GitHub after completing the documented free OAuth setup.
- The CMS can create a draft with all existing article fields and upload a cover image.
- Saving produces a valid Markdown file in `src/content/posts` and media in `public/uploads`.
- Turning off `draft` and saving triggers the existing GitHub Pages deployment without local Git commands.
- The owner can repeat the process using only the written Chinese guide.
