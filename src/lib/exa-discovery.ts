import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** Search excerpts are discovery leads only. Callers must fetch and validate each page. */
export function parseExaSearch(text: string) {
  return text.split(/(?=^Title: )/m).flatMap(block => {
    const url = block.match(/^URL:\s*(https?:\/\/\S+)/m)?.[1];
    if (!url) return [];
    return [{ url, title: block.match(/^Title:\s*(.+)/m)?.[1]?.slice(0, 200) || url,
      snippet: (block.split(/^Highlights:\s*/m)[1] || '').slice(0, 1200),
      publishedAt: block.match(/^Published:\s*(\d{4}-\d{2}-\d{2}[^\s]*)/m)?.[1] || null }];
  }).slice(0, 3);
}

export async function searchExaPublic(query: string) {
  const client = new Client({ name: 'seed-street-research', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('https://mcp.exa.ai/mcp')), { timeout: 10000 });
    const result = await client.callTool({ name: 'web_search_exa', arguments: {
      query, numResults: 3,
      objective: 'Find relevant public source pages. Prefer original company/vendor documentation and authoritative industry sources. Return source URLs; snippets will only be used to discover pages, never as evidence.'
    } }, undefined, { timeout: 12000 });
    if (result.isError) throw new Error('Exa public discovery returned a tool error.');
    const content = Array.isArray(result.content) ? result.content : [];
    const text = content.flatMap(block => block.type === 'text' && typeof block.text === 'string' ? [block.text] : []).join('\n');
    const hits = parseExaSearch(text);
    if (!hits.length && !/no (?:results|matches)/i.test(text)) throw new Error('Exa public discovery returned no parseable source URLs.');
    return hits;
  } finally { await client.close().catch(() => undefined); }
}
