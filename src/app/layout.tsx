import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Seed Street — Startup research', description: 'Your thesis. Your AI research team. Discover and evaluate startups with sourced diligence, then turn conviction into an investor-ready proposal.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
