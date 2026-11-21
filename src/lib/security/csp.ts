const IMAGE_HOSTS = [
  "https://picsum.photos",
  "https://fastly.picsum.photos",
  "https://images.unsplash.com",
  "https://*.supabase.co",
];

const SUPABASE_CONNECT = ["https://*.supabase.co", "wss://*.supabase.co"];

export function createNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean
): string {
  const localConnect = isDevelopment
    ? " http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
    : "";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${IMAGE_HOSTS.join(" ")}`,
    "font-src 'self'",
    `connect-src 'self' ${SUPABASE_CONNECT.join(" ")}${localConnect}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
  ];

  if (!isDevelopment) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}
