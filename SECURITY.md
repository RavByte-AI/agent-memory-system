# Security Policy

## Reporting a Vulnerability

Please report security issues privately to the maintainers before opening a public issue.

## Secret Handling

Agent Memory System should never store live secret values in generated memory files. It may record environment variable names such as `DATABASE_URL` or `API_KEY`, but not their values.

If generated output contains a real secret, delete the output and rotate the credential.
