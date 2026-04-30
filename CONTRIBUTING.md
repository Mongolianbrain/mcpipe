# Contributing to MCPipe

## Setup

```bash
git clone https://github.com/Mongolianbrain/mcpipe.git
cd mcpipe
cp .env.example .env
npm install
```

## Development

```bash
npm run build
npm start
```

## Adding a Tool

1. Open `src/index.ts`
2. Register a new tool with `server.tool(name, schema, handler)`
3. Use Zod for input validation
4. Run `npm run build` — fix all TypeScript errors before committing

## Pull Request Rules

- One feature per PR
- Clean build required (`npm run build` passes with zero errors)
- Descriptive commit messages (`feat:`, `fix:`, `docs:`)
- No commented-out code
- No secrets or `.env` files committed

## Commit Convention

```
feat: add new tool
fix: handle timeout in fetch_url
docs: update README
```
