# Release Checklist

Use this checklist before publishing CardDown to npm.

## One-Time Checks

- Confirm the npm package name `carddown` is available or owned by the maintainer.
- Confirm the GitHub repository is `WiseZenn/carddown`, or update `package.json` metadata.
- Confirm `MIT` is the intended public license.

## Every Release

```bash
npm ci
npm test
npm run test:render
npm pack --dry-run --json --cache .npm-cache
```

Review the dry-run output and confirm the package contains only:

- `dist/` runtime files
- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `package.json`

## Publish

```bash
npm publish
```

After publishing:

- Verify `npx carddown --help` works from a clean directory.
- Create a GitHub release with the `CHANGELOG.md` notes.
- Close or update release-tracking issues.
