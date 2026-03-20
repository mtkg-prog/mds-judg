import { NextResponse } from 'next/server';

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const sheetsId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  return NextResponse.json({
    gemini: geminiKey ? 'configured' : 'missing',
    sheets: sheetsId ? 'configured' : 'missing',
  });
}
