# npm Publishing And Release Automation Guide

This guide is for the maintainer of `@ravbyte/agent-memory-system`.

Package:

```text
@ravbyte/agent-memory-system
```

Repository:

```text
https://github.com/RavByte-AI/agent-memory-system
```

## Goal

When code lands on `main`, GitHub Actions should:

1. Install dependencies.
2. Run typecheck, tests, build, and memory validation.
3. Check whether `package.json` contains a version that is not yet published to npm.
4. Publish that version to npm with the `latest` dist-tag.
5. Create a GitHub Release for the same version.

The workflow intentionally skips publishing if the exact package version already exists on npm. npm versions are immutable, so every publish requires a new `package.json` version.

## Recommended npm Setup

Use npm Trusted Publishing instead of long-lived npm tokens.

Trusted Publishing lets GitHub Actions publish through OIDC and automatically attaches npm provenance to the package. This avoids storing `NPM_TOKEN` in GitHub secrets.

## npm Account Checklist

1. Sign in to `https://www.npmjs.com/` with username `ravbyte`.
2. Enable strong 2FA on the npm account.
3. Confirm the `@ravbyte` scope is available under the account.
4. Publish the package publicly, not privately.
5. After the first package exists on npm, configure Trusted Publishing for it.

## First Publish Options

### Option A: First Publish Through GitHub Actions

Use this if npm lets you configure Trusted Publishing before the first publish for the package.

1. Push a commit containing `.github/workflows/publish.yml`.
2. In npm, configure Trusted Publishing for:
   - Package: `@ravbyte/agent-memory-system`
   - Repository owner: `RavByte-AI`
   - Repository name: `agent-memory-system`
   - Workflow filename: `publish.yml`
   - Environment: leave empty unless you later add one to the workflow
3. Run the **Publish npm** workflow manually from GitHub Actions.

### Option B: Manual First Publish, Then Automation

Use this if npm requires the package to exist before Trusted Publishing can be configured.

From a clean local checkout:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run memory:check
npm publish --access public
```

Then configure Trusted Publishing in npm for future automated releases.

## GitHub Workflow

The workflow is:

```text
.github/workflows/publish.yml
```

It uses:

- `id-token: write` for npm Trusted Publishing
- `contents: write` for GitHub Release creation
- `npm publish --access public`
- `gh release create ... --generate-notes --latest`

No `NPM_TOKEN` secret is required when Trusted Publishing is configured correctly.

## Versioning Rule

Before merging to `main`, bump the version:

```bash
npm version patch --no-git-tag-version
```

Use the right bump:

```bash
npm version patch --no-git-tag-version   # fixes
npm version minor --no-git-tag-version   # backward-compatible features
npm version major --no-git-tag-version   # breaking changes
```

Commit `package.json` and `package-lock.json` with the code change.

## Install Commands For Users

Always recommend `@latest`:

```bash
npx @ravbyte/agent-memory-system@latest init
```

Or:

```bash
npm install -g @ravbyte/agent-memory-system@latest
agent-memory init
```

## GitHub Releases

When npm publish succeeds, the workflow creates a GitHub Release tagged as:

```text
vX.Y.Z
```

GitHub release notes are generated automatically.

## GitHub Packages

Do not publish this package to GitHub Packages unless there is a specific need for a second registry. The public package registry for users should be npm:

```text
https://www.npmjs.com/package/@ravbyte/agent-memory-system
```

## Failure Modes

### `403 Forbidden`

Check:

- npm Trusted Publishing is configured for the exact repo and workflow.
- `package.json` repository URL is exactly `https://github.com/RavByte-AI/agent-memory-system`.
- The workflow has `id-token: write`.
- The package is public scoped, not private.

### `You cannot publish over the previously published versions`

The package version already exists on npm. Bump the version and merge again.

### GitHub Release Already Exists

The workflow only creates a release when it publishes a new npm version. If a release already exists for the same tag, verify whether the npm publish already succeeded.

## Sources

- npm scoped public packages: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- npm Trusted Publishing: https://docs.npmjs.com/trusted-publishers
- npm provenance: https://docs.npmjs.com/generating-provenance-statements
- GitHub release CLI: https://cli.github.com/manual/gh_release_create
