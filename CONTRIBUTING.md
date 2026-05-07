# Contributing

Thanks for helping improve Agent Memory System.

## Local Setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Contribution Guidelines

- Keep scanner behavior deterministic unless a feature explicitly opts into an LLM provider.
- Do not add logic that reads or stores secret values from `.env` files.
- Add tests for new analyzers, validators, and generated memory contracts.
- Keep generated memory useful for both AI agents and humans.

## Pull Requests

Include a short summary, testing notes, and any changes to generated memory shape or public CLI/API behavior.

Changes to `main` should go through pull requests with the `Required CI` status check passing.

If the pull request should publish a new npm release after merge, bump `package.json` and `package-lock.json` before merging. The `Publish npm` workflow skips versions that already exist on npm.
