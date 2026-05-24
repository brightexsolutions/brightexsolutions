export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Allow requests from the same origin or when no origin header (server-to-server)
  if (!origin) return true;
  return origin === siteUrl || origin.startsWith("http://localhost");
}
