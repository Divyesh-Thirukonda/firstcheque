import type { NextConfig } from 'next';
import { FRONTEND_ORIGINS } from './src/lib/frontend-origins';
const nextConfig: NextConfig = {
  devIndicators: false,
  // The Ninoo build hosts the investor UI; these exact origins use this backend.
  async headers() {
    return FRONTEND_ORIGINS.map(origin => ({
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
