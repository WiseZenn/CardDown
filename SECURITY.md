# Security Policy

## Supported Versions

Security fixes are currently provided for the latest released version of CardDown.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the maintainer instead of opening a public issue.

If this repository is hosted on GitHub, use the repository security advisory flow when available. Otherwise, contact the maintainer listed in `package.json` and include:

- The affected version or commit.
- A minimal reproduction.
- The expected and actual behavior.
- Whether the input Markdown, theme CSS, or local files are trusted or untrusted.

## Security Defaults

CardDown disables raw Markdown HTML by default. Use `--allow-html` only for trusted documents.

CardDown also rejects explicit `file:` URLs in Markdown and theme CSS by default. Use `--allow-local-files` only when the document and theme are trusted.
