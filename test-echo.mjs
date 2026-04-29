import { spawn } from 'child_process';
import { createInterface } from 'readline';
const server = spawn('node', ['dist/index.js']);
const rl = createInterface({ input: server.stdout, terminal: false });
server.stderr.on('data', (data) => { console.error(`[SERVER STDERR]: ${data.toString().trim()}`); });
function send(rpcPayload) { server.stdin.write(JSON.stringify(rpcPayload) + '\n'); }
rl.on('line', (line) => {
  if (!line.trim()) return;
  try { handleMessage(JSON.parse(line)); }
  catch (err) { console.error("Failed to parse:", line); }
});
function handleMessage(rpcMsg) {
  const rpcId = rpcMsg['id'];
  const rpcError = rpcMsg['error'];
  const rpcResult = rpcMsg['result'];
  if (rpcId === 1 && !rpcError) {
    send({ jsonrpc: "2.0", method: "notifications/initialized" });
    send({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "echo", arguments: { message: "hello" } } });
  } else if (rpcId === 2) {
    const resultText = rpcResult?.content?.[0]?.text;
    console.log("Result:", resultText);
    server.kill();
    process.exit(resultText === "hello" ? 0 : 1);
  } else if (rpcError) {
    console.error("Error:", JSON.stringify(rpcMsg));
    server.kill();
    process.exit(1);
  }
}
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test-client", version: "1.0.0" } } });
setTimeout(() => { console.error("Timeout"); server.kill(); process.exit(1); }, 5000);
