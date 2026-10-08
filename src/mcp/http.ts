import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authorizeBearer } from './auth';
import { createTracksonMcpServer } from './server';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, Accept, MCP-Session-Id, mcp-session-id',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export interface McpHttpDeps {
  mcpToken?: string;
  createServer?: typeof createTracksonMcpServer;
}

function applyCors(res: ServerResponse): void {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    res.setHeader(key, value);
  }
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  if (res.headersSent) return;
  applyCors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function parseBody(body: unknown): unknown {
  if (body == null || body === '') return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return undefined;
    }
  }
  return body;
}

function authorizationHeader(req: IncomingMessage): string | string[] | undefined {
  return req.headers.authorization ?? req.headers.Authorization;
}

export async function handleMcpHttp(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  deps: McpHttpDeps = {},
): Promise<void> {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const token = deps.mcpToken ?? process.env.MCP_TOKEN;
  if (!authorizeBearer(authorizationHeader(req), token)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    sendJson(res, 405, {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const createServer = deps.createServer ?? createTracksonMcpServer;
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  const close = () => {
    void transport.close();
    void server.close();
  };
  res.on('close', close);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parseBody(req.body));
  } catch (err) {
    console.error('MCP request failed', err);
    sendJson(res, 500, {
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal server error' },
      id: null,
    });
    close();
  }
}
