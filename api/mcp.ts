import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleMcpHttp } from '../src/mcp/http';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  await handleMcpHttp(req, res);
}
