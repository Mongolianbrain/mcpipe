#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const server = new McpServer({ name: "mcpipe", version: "0.1.0" });
async function main() {
  const transport = new StdioServerTransport();
  server.tool("echo", "Echoes the provided message back to the user", { message: z.string() }, async ({ message }) => ({ content: [{ type: "text", text: message }] }));
  await server.connect(transport);
}
main().catch((err) => { console.error("Server error:", err); process.exit(1); });
