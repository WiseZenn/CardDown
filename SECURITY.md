# Security Policy

## Supported Versions

Security fixes are provided for the latest released version of CardDown. Older
versions are not patched; upgrade with:

```bash
npm update -g @carddown/cli
```

## Reporting a Vulnerability

**Use GitHub private vulnerability reporting:**
<https://github.com/WiseZenn/carddown/security/advisories/new>

This opens a private advisory visible only to you and the maintainer. Please do
not open a public issue for a suspected vulnerability.

Include:

- The affected version or commit.
- A minimal reproduction.
- The expected and actual behavior.
- Whether the input Markdown, theme CSS, or local files are trusted or untrusted.

You can expect an initial response within a few days. This is a
maintainer-run project without a paid security team, so please allow for that.

## Security Model

CardDown renders untrusted Markdown inside a headless browser, so the defaults
are deliberately conservative.

**Raw HTML is disabled.** Raw HTML in Markdown is escaped rather than rendered.
Enable it only for documents you trust:

```bash
carddown -i doc.md --allow-html
```

**Local file access is disabled.** Explicit `file:` URLs in Markdown and theme
CSS are rejected, as are absolute local image paths. Relative-path images are
still embedded as data URLs. Enable it only for trusted input and themes:

```bash
carddown -i doc.md --allow-local-files
```

**Remote images are fetched.** `http:` and `https:` image URLs in a document are
requested by the renderer, so converting an untrusted document contacts the
hosts it references. Treat conversion of untrusted input as a network request
to those hosts.

## Dependency Vulnerabilities

Dependencies are monitored by Dependabot and by a scheduled `npm audit`
workflow. `katex` renders math from document content; CardDown does not enable
KaTeX's `trust` option, so document-supplied commands that would require it are
not executed.
