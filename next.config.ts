import type { NextConfig } from 'next';
const nextConfig: NextConfig = { serverExternalPackages: ['@opentelemetry/sdk-trace-node', '@opentelemetry/exporter-trace-otlp-proto'] };
export default nextConfig;
