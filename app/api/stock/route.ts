import { NextResponse } from 'next/server';

const BASE_URL = `https://api.polygon.io/v2/aggs/ticker/`;

export async function POST(req: Request) {
  console.log('API route called');
  const startTime = Date.now();

  try {
    const { symbol, name, days } = await req.json();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const url = `${BASE_URL}${symbol}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}?adjusted=true&sort=asc&limit=50000&apiKey=${process.env.POLYGON_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.statusText}`);
    }

    const data = await response.json();

    const result = {
      ticker: symbol,
      companyName: name,
      days,
      chartData: data.results.map((item: any) => ({
        date: new Date(item.t).toISOString().split('T')[0],
        close: item.c
      }))
    };
    
    console.log(`API call completed in ${Date.now() - startTime}ms`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to process request: ${errorMessage}` }, { status: 500 });
  }
}