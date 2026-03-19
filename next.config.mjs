/** @type {import('next').NextConfig} */

// Security headers applied to every route.
// Tighten script-src / style-src once a CSP nonce or hash strategy is in place.
const securityHeaders = [
  // Force HTTPS for 2 years, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block clickjacking — only our own origin may frame the app
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer to origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser features the app does not use
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Basic CSP — restricts unknown script/style/connect sources.
  // 'unsafe-inline' and 'unsafe-eval' are present because Next.js 14 still
  // requires them for RSC hydration; tighten after migrating to nonce-based CSP.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://pbs.twimg.com https://abs.twimg.com https://coin-images.coingecko.com",
      "font-src 'self'",
      "connect-src 'self' https://auth.privy.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  async headers() {
    return [
      {
        // Apply to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    // Explicitly allow only the CDN hostnames the app actually uses.
    // The previous "**" wildcard exposed the image optimiser to SSRF and DoS
    // (GHSA-9g9p-9gw9-jx7f). Local static assets (pack.png, verso.png) do not
    // need a remotePattern entry.
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
    ],
  },
};
export default nextConfig;
