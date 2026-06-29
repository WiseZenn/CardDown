# CardDown Icon Motion Spec

## Static Identity

- Brand/product: CardDown
- Category: Markdown-to-paginated-image-card renderer and CLI/Core workspace
- Selected direction: Markdown-inspired `M↓` on a card stack
- Intended use: GitHub README, npm package, app icon, favicon/social avatar, short-video opener, future Studio/Desktop icon

## Design Rationale

This revision replaces the abstract `C + down` center mark with a clearer Markdown-inspired `M↓` symbol. The previous symbol depended on knowing the product name first; this version communicates the input/output idea faster: Markdown goes down into a card stack.

The card layers stay quiet and low-contrast so they provide context without competing with the center mark. The mark is split into two readable actors: teal `M` for Markdown/content and amber downward arrow for conversion/output.

## Color System

- App tile: `#fffaf2` to `#edf5f2`
- Markdown/content teal: `#2d6f68`
- Conversion amber: `#d56f49`
- Front card: `#ffffff` to `#fbf4ea`
- Supporting cards: `#dcebe6`, `#efe0cf`
- Text/inspection ink: `#2f3735`

## Motion Personality

Personality words: precise, warm, constructive.

Preset basis: Trustworthy / Professional, softened with a friendly editorial cadence.

- Total reveal: 1200ms
- Anticipation: 0-240ms, quiet scale-down / empty stage
- Action: 240-840ms, card stack rises and the M stroke draws on
- Follow-through: 840-1200ms, arrow settles and all parts land on the verified static frame
- Easing: confident ease-out plus narrative curve; no squash deformation

## Semantic Parts

- `#app-tile`: rounded app container
- `#card-stack`: quiet layered card support group
- `#back-card`: muted teal rear card
- `#middle-card`: warm paper middle card
- `#document-card`: front card face
- `#fold-accent`: retained as an empty group for motion compatibility
- `#markdown-lines`: retained as an empty group for motion compatibility
- `#mark-c`: Markdown-inspired M draw-on stroke, `pathLength="1"`
- `#down-arrow`: down-arrow draw-on stroke, `pathLength="1"`

## Timeline

| Time | Beat | Motion | Principles |
|------|------|--------|------------|
| 0ms | Staging | Tile hidden, stack below final position | Staging |
| 216ms | Anticipation | Tile compresses slightly before entry | Anticipation, Timing |
| 480ms | Assembly | Card stack and front card rise in sequence | Overlapping action, Arcs |
| 720ms | Draw | M stroke completes | Slow in/out, Solid drawing |
| 864ms | Conversion | Arrow draws down into final position | Staging, Appeal |
| 1200ms | Settle | Final frame equals `logo.svg` | Final Frame Contract |

## QA Notes

This run starts from a hand-authored motion-ready SVG rather than an auto-traced raster, so the vectorization smoothness gate is satisfied by primitive and few-path construction. Source PNGs are renders of the accepted SVG, used as pixel reference for final-frame checks rather than as tracing input.

Small-size previews were generated at 128px, 64px, and 32px under `outputs/icon-size-strip.png`.

Known scope: this is a production-ready first icon and motion-ready SVG package, not a trademark clearance review.
