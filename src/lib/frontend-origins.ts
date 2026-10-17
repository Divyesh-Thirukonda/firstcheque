/** Exact origins of the separately hosted Seed Street investor workspace. */
export const FRONTEND_ORIGINS = [
  "https://seed-street-source-e8e0.ninoo.app",
  "https://p-f60820e4f4623fd8.preview.ninoo.app",
] as const;

export function proposalOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next's local/proxied Request URL can use an internal host. The browser's
  // Host header still identifies the actual same-origin request destination.
  const host = request.headers.get("host");
  return !origin || origin === url.origin || (host !== null && origin === `${url.protocol}//${host}`) || FRONTEND_ORIGINS.some(value => value === origin);
}
