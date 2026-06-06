# Release Checklist

Use this checklist before publishing CardDown to npm.

## Current Status

npm publishing is intentionally paused. GitHub CI only tests and performs
dry-run package checks; it does not publish anything.

`@carddown/core` is currently an internal private workspace package. Before a
future CLI npm release, decide whether Core should be published separately or
bundled into the CLI package.

## One-Time Checks

- Confirm the npm package name `carddown` is available or owned by the maintainer.
- Confirm the GitHub repository is `WiseZenn/carddown`, or update `package.json` metadata.
- Confirm `MIT` is the intended public license.

## Every Release

```bash
npm ci
npm test
npm run test:render
npm run pack:check
```

Review the dry-run output and confirm the package contains only:

- package-specific `dist/` runtime files
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

## Publish

```bash
npm publish --workspace carddown
```

After publishing:

- Verify `npx carddown --help` works from a clean directory.
- Create a GitHub release with the `CHANGELOG.md` notes.
- Close or update release-tracking issues.
