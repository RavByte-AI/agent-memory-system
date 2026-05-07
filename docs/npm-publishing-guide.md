# npm Publishing Guide

This guide is for publishing `@ravbyte/agent-memory-system`.

Package:

```text
@ravbyte/agent-memory-system
```

Repository:

```text
https://github.com/RavByte-AI/agent-memory-system
```

## Trusted Publisher Settings

In npm, configure GitHub Actions Trusted Publishing with:

```text
Repository owner: RavByte-AI
Repository name: agent-memory-system
Workflow file: publish.yml
Environment name: npm-publish
Package: @ravbyte/agent-memory-system
```

In GitHub, create an environment named:

```text
npm-publish
```

Optional but recommended: add required reviewers to the `npm-publish` environment.

## First Publish

If npm requires the package to exist before Trusted Publishing can be configured, publish manually once:

```bash
npm login
npm ci
npm run typecheck
npm test
npm run build
npm run memory:check
npm publish --access public
```

After that, configure Trusted Publishing and let GitHub Actions publish future versions.

## Automated Publishing

`.github/workflows/publish.yml` runs on `main` and:

1. Runs typecheck, tests, build, and memory validation.
2. Checks whether the current `package.json` version already exists on npm.
3. Publishes only if the version is new.
4. Attempts to deprecate all older versions.
5. Creates a GitHub Release for the published version.

## Deprecating Older Versions

The workflow publishes with Trusted Publishing/OIDC. `npm deprecate` may require a registry token because it is a separate registry mutation.

To enable automatic old-version deprecation, create a granular npm token with the narrowest package permissions npm allows for `@ravbyte/agent-memory-system`, then add it to GitHub Actions secrets as:

```text
NPM_TOKEN
```

The workflow will run:

```bash
npm deprecate "@ravbyte/agent-memory-system@<CURRENT_VERSION" "This version is deprecated. Please install @ravbyte/agent-memory-system@latest."
```

If `NPM_TOKEN` is not configured, publishing still works and the deprecation step is skipped with a warning.

## Releasing A New Version

Before merging a release PR:

```bash
npm version patch --no-git-tag-version
npm install --package-lock-only
git add package.json package-lock.json
git commit -m "Release vX.Y.Z"
```

Use `minor` for backward-compatible features and `major` for breaking changes.

## User Install Commands

Always recommend latest:

```bash
npx @ravbyte/agent-memory-system@latest init
npm install -g @ravbyte/agent-memory-system@latest
```
