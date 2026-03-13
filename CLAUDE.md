# Claude Code Guidelines

## About

A TypeScript library (pngx) for encoding and decoding PNG images with comprehensive type safety and built-in memory management. It supports all standard color types (Grayscale, RGB, RGBA, Palette), all PNG filter types (None, Sub, Up, Average, Paeth, Adaptive), proper handling of critical PNG chunks (IHDR, IDAT, PLTE, IEND), and robust error handling for malformed data. The library is zero-dependency and provides a streaming API via `parse()` and `pack()` methods.

## Linting

- Use **pickier** for linting — never use eslint directly
- Run `bunx --bun pickier .` to lint, `bunx --bun pickier . --fix` to auto-fix
- When fixing unused variable warnings, prefer `// eslint-disable-next-line` comments over prefixing with `_`

## Frontend

- Use **stx** for templating — never write vanilla JS (`var`, `document.*`, `window.*`) in stx templates
- Use **crosswind** as the default CSS framework which enables standard Tailwind-like utility classes
- stx `<script>` tags should only contain stx-compatible code (signals, composables, directives)

## Dependencies

- **buddy-bot** handles dependency updates — not renovatebot
- **better-dx** provides shared dev tooling as peer dependencies — do not install its peers (e.g., `typescript`, `pickier`, `bun-plugin-dtsx`) separately if `better-dx` is already in `package.json`
- If `better-dx` is in `package.json`, ensure `bunfig.toml` includes `linker = "hoisted"`

## Commits

- Use conventional commit messages (e.g., `fix:`, `feat:`, `chore:`)
