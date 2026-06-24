# @carddown/core

Reusable Markdown parsing, theming, pagination, and rendering APIs for CardDown products.

```ts
import { parseMarkdown, renderToPages, resolveTheme } from "@carddown/core";
```

The package currently targets Node.js because rendering uses Playwright and filesystem-backed assets.

This package is published as the runtime dependency used by the `carddown` CLI.
Applications should import the supported API from `@carddown/core` instead of
reaching into internal source files.
