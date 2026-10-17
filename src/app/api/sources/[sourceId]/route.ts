import { EVIDENCE } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const source = EVIDENCE.find((item) => item.id === sourceId);
  if (!source) return new Response("Source not found.", { status: 404 });
  return new Response(`${source.title}\n\nFICTIONAL HACKATHON EVIDENCE — NOT A REAL COMPANY OR OFFERING\n\nDocument ID: ${source.id}\nPublisher: ${source.publisher}\nDate: ${source.date}\nType: ${source.type}\n\n${source.excerpt}\n\nExact financial fields:\n${JSON.stringify(source.metrics, null, 2)}\n\nThis source is synthetic and unaudited. It is used to demonstrate citation integrity, metric validation, and reproducible agent evaluation.\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" } });
}
