import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handler.js";

function parseArgs(argv: string[]): { projectDir: string } {
  const idx = argv.indexOf("--project-dir");
  if (idx === -1 || idx + 1 >= argv.length) {
    console.error("Usage: awe-mcp-server --project-dir <path>");
    process.exit(1);
  }
  return { projectDir: argv[idx + 1] };
}

async function main() {
  const { projectDir } = parseArgs(process.argv);

  const server = new Server(
    { name: "awe-engine", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, request.params.arguments ?? {}, projectDir);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AWE MCP Server started");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
