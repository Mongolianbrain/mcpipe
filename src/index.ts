#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
const server = new McpServer({ name: "mcpipe", version: "0.1.0" });
server.tool("echo", "Echoes the provided message back to the user", { message: z.string() }, async ({ message }) => ({ content: [{ type: "text", text: message }] }));
server.tool("fetch_url", "Fetches a web page and returns its title and first 500 characters", { url: z.string().url() }, async ({ url }) => {
  try {
    const res = await axios.get<string>(url, { responseType: "text", timeout: 10000, headers: { "User-Agent": "MCPipe/1.0" } });
    const html: string = res.data;
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "(no title)").replace(/\s+/g, " ").trim();
    const body = html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 500);
    return { content: [{ type: "text", text: `Title: ${title}\n\nBody:\n${body}` }] };
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err) ? `HTTP error: ${err.message}` : err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }] };
  }
});
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCPipe running");
}
main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
