import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  devIndicators: false,
  // Credentials are supplied at runtime, never packaged as traced files.
  outputFileTracingExcludes: { '/*': ['./.env*', './work/**/*'] },
};
export default nextConfig;
