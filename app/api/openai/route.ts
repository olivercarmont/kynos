import { NextResponse } from 'next/server';
import { getStockData } from '@/lib/get-stock-data';

export async function POST(req: Request) {
  console.log('API route called');
  const startTime = Date.now();

  try {
    const { symbol, name, days } = await req.json();

    // Fetch stock data
    const stockData = await getStockData(symbol, days);
    
    const result = {
      ticker: symbol,
      companyName: name || "Unknown Company", // Use the provided name or fallback to "Unknown Company"
      days,
      chartData: stockData
    };
    
    console.log(`API call completed in ${Date.now() - startTime}ms`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to process request: ${errorMessage}` }, { status: 500 });
  }
}