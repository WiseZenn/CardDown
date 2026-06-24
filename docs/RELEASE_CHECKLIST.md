# Release Checklist

Use this checklist before publishing CardDown to npm.

## Current Status

npm publishing is intentionally manual. GitHub CI tests and performs dry-run
package checks; it does not publish anything.

`@carddown/core` is published separately as the runtime dependency used by the
CLI. Publish Core before publishing `@carddown/cli`, and verify both package
contents.

## One-Time Checks

- Confirm the npm package name `@carddown/cli` is available or owned by the maintainer.
- Confirm the npm scope `@carddown` is available or owned by the maintainer.
- Confirm `npm whoami` is the intended publishing account.
- Confirm the GitHub repository is `WiseZenn/carddown`, or update package metadata.
- Confirm `MIT` is the intended public license.

## Every Release

```bash
npm ci
npm test
npm run test:render
npm run pack:check
npm run publish:dry-run
```

If Core for the current version has already been published, `publish:dry-run`
will correctly fail on the already-published Core version. In that case, verify
and publish only the remaining CLI package:

```bash
npm run publish:dry-run:cli
```

Review the dry-run output and confirm each package contains only:

- package-specific `dist/` runtime files
- `README.md`
- `LICENSE`
- `package.json`

Confirm package versions and dependency pins match:

```bash
node packages/cli/dist/index.js --version
npm view '@carddown/cli' version
npm view '@carddown/core' version
```

For first publication, `npm view` should return 404 before publishing. For later
releases, it should show the previous version, not the version about to be
published.

## Publish

```bash
npm publish --workspace '@carddown/core' --access public
npm publish --workspace '@carddown/cli' --access public
```

If Core is already published for this version, publish only CLI:

```bash
npm run publish:cli
```

After publishing:

- Verify `npx -y '@carddown/cli' --help` works from a clean directory.
- Verify a minimal Markdown render from a clean directory.
- Create a GitHub release with the `CHANGELOG.md` notes.
- Close or update release-tracking issues.