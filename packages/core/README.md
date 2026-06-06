# @carddown/core

Reusable Markdown parsing, theming, pagination, and rendering APIs for CardDown products.

```ts
import { parseMarkdown, renderToPages, resolveTheme } from "@carddown/core";
```

The package currently targets Node.js because rendering uses Playwright and filesystem-backed assets.

This is currently an internal workspace package and is not published separately
to npm. CardDown CLI, Studio, and Desktop should consume this shared boundary.
