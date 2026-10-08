import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it } from 'vitest';
import { handleMcpHttp } from './http';

class MockRes extends EventEmitter {
  statusCode = 200;
  headers: Record<string, string> = {};
  body = '';
  headersSent = false;

  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }

  end(chunk?: string) {
    this.headersSent = true;
    if (chunk) this.body += chunk;
    this.emit('finish');
  }
}

function req(init: {
  method?: string;
  authorization?: string;
  body?: unknown;
}): IncomingMessage & { body?: unknown } {
  return {
    method: init.method ?? 'POST',
    headers: init.authorization ? { authorization: init.authorization } : {},
    body: init.body,
  } as IncomingMessage & { body?: unknown };
}

describe('handleMcpHttp auth', () => {
  it('returns 401 without a bearer token', async () => {
    const res = new MockRes();
    await handleMcpHttp(req({}), res as unknown as ServerResponse, {
      mcpToken: 'secret',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'unauthorized' });
  });

  it('returns 401 for the wrong token', async () => {
    const res = new MockRes();
    await handleMcpHttp(req({ authorization: 'Bearer nope' }), res as unknown as ServerResponse, {
      mcpToken: 'secret',
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns 405 for GET even with a valid token (stateless)', async () => {
    const res = new MockRes();
    await handleMcpHttp(
      req({ method: 'GET', authorization: 'Bearer secret' }),
      res as unknown as ServerResponse,
      { mcpToken: 'secret' },
    );
    expect(res.statusCode).toBe(405);
  });
});
