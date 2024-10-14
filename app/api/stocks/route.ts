import { NextResponse } from 'next/server';
import { parseTickerList } from '@/lib/ticker-parser';

export async function GET() {
  const stocks = parseTickerList();
  return NextResponse.json(stocks);
}