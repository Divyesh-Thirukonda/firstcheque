import "server-only";
const visits = new Map<string, { count: number; until: number }>();
export function proposalRequestAllowed(request: Request, operation: string) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return false;
  const key = `${operation}:${request.headers.get("x-forwarded-for")?.split(",")[0] || "local"}`,
    now = Date.now(),
    previous = visits.get(key);
  if (visits.size > 2000)
    for (const [id, value] of visits) if (value.until < now) visits.delete(id);
  if (previous && previous.until > now) {
    if (previous.count >= 6) return false;
    previous.count++;
  } else visits.set(key, { count: 1, until: now + 60000 });
  return true;
}
