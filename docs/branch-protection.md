# Branch Protection

The `main` branch should not accept direct pushes. All code should land through pull requests with CI passing.

This repository includes `.github/rulesets/main-branch-protection.json` as a reference ruleset. Apply the same policy in GitHub:

1. Open `https://github.com/RavByte-AI/agent-memory-system`.
2. Go to **Settings** -> **Rules** -> **Rulesets**.
3. Create a new branch ruleset.
4. Target branch: `main`.
5. Enable:
   - Restrict deletions
   - Require a pull request before merging
   - Require status checks to pass
   - Require branches to be up to date before merging
   - Block force pushes
6. Required status checks:
   - `test`
7. Save and enable the ruleset.

After this is enabled, no one should push directly to `main`; changes must go through CI/CD-backed pull requests.
