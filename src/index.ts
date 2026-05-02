import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import express from "express";

const execAsync = promisify(exec);

const AGENT_URL = process.env.AGENT_URL ?? "";
const AGENT_AUTH_TOKEN = process.env.AGENT_AUTH_TOKEN ?? "";

const agentHeaders = () => ({
  "Content-Type": "application/json",
  ...(AGENT_AUTH_TOKEN ? { Authorization: `Bearer ${AGENT_AUTH_TOKEN}` } : {}),
});

const store = new Map<string, string>();
let lastTaskId: string | null = null;
let lastStatus: string | null = null;

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
      const taskId = `task_${Date.now()}`;
      lastTaskId = taskId;
      lastStatus = "sent";
      store.set(taskId, JSON.stringify({ prompt, context, priority }));
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
  "Gets the status of the most recent task",
  {
    task_id: z.string().optional(),
  },
  async ({ task_id }) => {
    if (task_id) {
      const value = store.get(task_id) ?? null;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ task_id, status: value ? "stored" : "not_found", data: value }),
        }],
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ task_id: lastTaskId, status: lastStatus }),
      }],
    };
  }
);

server.tool(
  "read_memory",
  "Reads a value from the in-process store by key",
  {
    key: z.string(),
  },
  async ({ key }) => {
    const value = store.get(key) ?? null;
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ key, value }),
      }],
    };
  }
);

server.tool(
  "push_result",
  "Stores a key-value pair in the in-process store",
  {
    key: z.string(),
    value: z.string(),
  },
  async ({ key, value }) => {
    store.set(key, value);
    lastTaskId = key;
    lastStatus = "stored";
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ key, value, stored: true }),
      }],
    };
  }
);

async function startStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (!process.env.AGENT_URL || process.env.AGENT_URL.includes('your-agent.com') || process.env.AGENT_URL === '') {
    console.warn('WARNING: AGENT_URL not configured. Tool send_task will return error.');
  }
  console.error("MCPipe server running on stdio");
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (err: any) => void;
  timer: NodeJS.Timeout;
}

async function startHttp() {
  const PORT = parseInt(process.env.MCP_PORT ?? "3000", 10);
  const app = express();
  app.use(express.json());

  const transport = new StdioServerTransport();
  const pending = new Map<string | number, PendingRequest>();

  transport.start = async () => {};
  transport.send = async (message: any) => {
    const id = message?.id;
    if (id !== undefined && pending.has(id)) {
      const { resolve, timer } = pending.get(id)!;
      clearTimeout(timer);
      pending.delete(id);
      resolve(message);
    }
  };
  transport.close = async () => {};

  await server.connect(transport);

  app.post("/mcp", async (req, res) => {
    const message = req.body;
    const id = message?.id;

    try {
      const result = await new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("timeout"));
        }, 30000);

        pending.set(id, { resolve, reject, timer });
        transport.onmessage?.(message);
      });

      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.status(500).json({ error: msg });
      }
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", transport: "http" });
  });

  app.listen(PORT, () => {
    console.error(`MCPipe server running on http://0.0.0.0:${PORT}/mcp`);
  });
}

const transportMode = process.env.MCP_TRANSPORT ?? "stdio";

if (transportMode === "http") {
  startHttp().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
} else {
  startStdio().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
