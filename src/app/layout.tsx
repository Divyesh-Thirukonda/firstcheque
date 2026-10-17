import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'FirstCheque — Find your next conviction', description: 'Private-market research matched to your thesis. Evidence before conviction.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
