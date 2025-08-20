import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listMessages, getMessage, sendEmail, countToday } from './gmail.js';
import { unknown } from 'zod/v4';

const server = new McpServer({ name: 'gmail-mcp', version: '0.1.0' });

server.tool(
  'gmail_send',
  {
    to: z.string().describe('Recipient email, e.g. user@example.com'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Plain text body')
  },
  async ({ to, subject, body }) => {
    const id = await sendEmail(to, subject, body);
    return { content: [{ type: 'text', text: `Sent! messageId=${id}` }] };
  }
);

server.tool(
  'gmail_list',
  {
    query: z.string().default('in:inbox newer_than:7d').describe('Gmail search query, e.g. "from:amazon"'),
    maxResults: z.number().int().min(1).max(50).default(10).describe('How many messages to list')
  },
  async ({ query, maxResults }) => {
    const ids = await listMessages(query, maxResults);
    return { content: [{ type: 'text', text: JSON.stringify(ids, null, 2) }] };
  }
);

server.tool(
  'gmail_read',
  {
    id: z.string().describe('Gmail message id')
  },
  async ({ id }) => {
    const m = await getMessage(id);
    const pretty = {
      id: m.id,
      from: m.from,
      subject: m.subject,
      dateIso: m.dateIso,
      snippet: m.snippet,
      bodyText: m.bodyText
    };
    return { content: [{ type: 'text', text: JSON.stringify(pretty, null, 2) }] };
  }
);

server.tool(
  'gmail_count_today',
  {},
  async () => {
    const n = await countToday();
    return { content: [{ type: 'text', text: String(n) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

