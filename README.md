# MCPipe

A lightweight MCP server that exposes tools for Claude and other AI agents to execute commands, fetch URLs, and manage task queues — over stdio or HTTP.

![works with Claude](https://img.shields.io/badge/works%20with-Claude-blueviolet)

## Quickstart

docker run -p 3000:3000 mongolianbrain/mcpipe

Test it:

curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"fetch_url","input":{"url":"https://example.com"}}'

## Tools

| Tool | Input | Output |
|------|-------|--------|
| echo | message: string | echoed message |
| fetch_url | url: string | page content |
| run_command | command: string | stdout + stderr |
| send_task | task: string | task id |
| get_status | id: string | task status |
| read_memory | key: string | stored value |
| push_result | key: string, value: string | confirmation |

## Contributing

See CONTRIBUTING.md
