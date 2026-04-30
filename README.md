# MCPipe

A lightweight MCP server exposing system tools over HTTP — built with Node.js, TypeScript, and the Model Context Protocol SDK.

## Quick Start

```bash
git clone https://github.com/Mongolianbrain/mcpipe.git
cd mcpipe
cp .env.example .env
npm install
npm run build
npm start
```

## Docker Deploy

```bash
docker compose up -d
```

## Tools

| Tool | Description |
|------|-------------|
| `echo` | Returns the input message |
| `fetch_url` | Fetches content from a URL |
| `run_command` | Executes a shell command on the server |
| `send_task` | Sends a task to a remote agent |
| `get_status` | Returns server or task status |
| `read_memory` | Reads a value from memory store |
| `push_result` | Pushes a result to memory store |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `ALLOWED_COMMANDS` | No | Comma-separated list of allowed shell commands |
| `MEMORY_STORE_PATH` | No | Path to memory store file |
| `REMOTE_AGENT_URL` | No | URL of remote agent for send_task |

## Requirements

- Node.js 18+
- Docker (optional)

## License

MIT
