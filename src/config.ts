import { z } from "zod";
const ConfigSchema = z.object({
  AGENT_URL: z.string().url(),
  AGENT_AUTH_TOKEN: z.string(),
  MCP_PORT: z.coerce.number().default(3000),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  LOG_LEVEL: z.enum(["info", "debug", "warn", "error"]).default("info"),
  TIMEOUT_MS: z.coerce.number().default(30000),
});
const config = ConfigSchema.parse(process.env);
export default config;
