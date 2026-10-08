import { z } from 'zod';

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      const allowed = 'values' in issue && Array.isArray(issue.values)
        ? `. Allowed: ${issue.values.map(String).join(', ')}`
        : '';
      return `${path}: ${issue.message}${allowed}`;
    })
    .join('; ');
}

export function parseArgs<T>(schema: z.ZodType<T>, args: unknown): T {
  const result = schema.safeParse(args ?? {});
  if (!result.success) {
    throw new ToolInputError(formatZodError(result.error));
  }
  return result.data;
}
