import { NextResponse } from 'next/server';

export async function GET() {
  const envKeys = Object.keys(process.env)
    .filter(k => k.startsWith('POSTGRES') || k.startsWith('DATABASE'))
    .map(k => {
      const val = process.env[k] || '';
      // Show only first 20 chars for security
      return `${k}=${val.substring(0, 20)}...`;
    });

  return NextResponse.json({ envKeys });
}
