import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  devIndicators: false,
  // The Ninoo build hosts the investor UI; these exact origins use this backend.
  async headers() {
    return [
      'https://seed-street-source-e8e0.ninoo.app',
      'https://p-f60820e4f4623fd8.preview.ninoo.app',
    ].map(origin => ({
      source: '/api/:path*',
      has: [{ type: 'header' as const, key: 'origin', value: origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }],
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, POST, OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        { key: 'Access-Control-Max-Age', value: '600' },
        { key: 'Vary', value: 'Origin' },
      ],
    }));
  },
  // Credentials are supplied at runtime, never packaged as traced files.
  outputFileTracingIncludes: { '/*': ['./node_modules/next/dist/lib/framework/**/*'] },
  outputFileTracingExcludes: { '/*': ['./.env*', './work/**/*'] },
};
export default nextConfig;
