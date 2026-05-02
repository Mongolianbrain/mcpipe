import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const AGENT_URL = process.env.AGENT_URL ?? "";
const AGENT_AUTH_TOKEN = process.env.AGENT_AUTH_TOKEN ?? "";

const agentHeaders = () => ({
  "Content-Type": "application/json",
  ...(AGENT_AUTH_TOKEN ? { Authorization: `Bearer ${AGENT_AUTH_TOKEN}` } : {}),
});

const server = new McpServer({
  name: "mcpipe",
  version: "1.0.0",
});

server.tool(
  "echo",
  "Echoes back the input message",
  {
    message: z.string().describe("Message to echo back"),
  },
  async ({ message }) => ({
    content: [{ type: "text", text: message }],
  })
);

server.tool(
  "fetch_url",
  "Fetches a web page and returns its content",
  {
    url: z.string().url().describe("URL to fetch"),
  },
  async ({ url }) => {
    try {
      const response = await axios.get(url, { responseType: "text" });
      return { content: [{ type: "text", text: String(response.data) }] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }
);

server.tool(
  "run_command",
  "Executes a shell command and returns stdout, stderr and exit code",
  {
    command: z.string(),
  },
  async ({ command }) => {
    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ stdout, stderr, exitCode: 0 }),
          },
        ],
      };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              stdout: e.stdout ?? "",
              stderr: e.stderr ?? "",
              exitCode: e.code ?? 1,
            }),
          },
        ],
      };
    }
  }
);

server.tool(
  "send_task",
  "Sends a task to the agent and returns task_id and status",
  {
    prompt: z.string(),
    context: z.string().optional(),
    priority: z.number().optional(),
  },
  async ({ prompt, context, priority }) => {
    try {
      const response = await axios.post(
        `${AGENT_URL}`,
        { prompt, context, priority },
        { headers: agentHeaders() }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }
);

server.tool(
  "get_status",
  "Gets the status of a task by task_id",
  {
    task_id: z.string(),
  },
  async ({ task_id }) => {
    try {
      const response = await axios.get(
        `${AGENT_URL}/status/${task_id}`,
        { headers: agentHeaders() }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }
);

server.tool(
  "read_memory",
  "Reads memory from the agent",
  {
    key: z.string().optional(),
    namespace: z.string().optional(),
  },
  async ({ key, namespace }) => {
    try {
      const response = await axios.get(
        `${AGENT_URL}/memory`,
        { headers: agentHeaders(), params: { key, namespace } }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }
);

server.tool(
  "push_result",
  "Pushes a result back to the agent",
  {
    task_id: z.string(),
    result: z.string(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  },
  async ({ task_id, result, metadata }) => {
    try {
      const response = await axios.post(
        `${AGENT_URL}/result`,
        { task_id, result, metadata },
        { headers: agentHeaders() }
      );
      return {
        content: [{ type: "text", text: JSON.stringify(response.data) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }] };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (!process.env.AGENT_URL || process.env.AGENT_URL.includes('your-agent.com') || process.env.AGENT_URL === '') {
    console.warn('WARNING: AGENT_URL not configured. Tools send_task, get_status, push_result, read_memory will return error.');
  }
  console.error("MCPipe server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
