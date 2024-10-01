import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTicker, getCompanyName } from '../../sp500_tickers';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

async function getStockGraph(ticker: string, days: number) {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const FROM_DATE = formatDate(startDate);
    const TO_DATE = formatDate(today);

    const BASE_URL = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${FROM_DATE}/${TO_DATE}?adjusted=true&sort=asc&apiKey=${process.env.POLYGON_API_KEY}`;

    const response = await fetch(BASE_URL);
    const data = await response.json();

    if (!data.results) {
      throw new Error(`Unable to fetch stock data for ${ticker}.`);
    }

    const chartData = data.results.map((result: any) => ({
      date: new Date(result.t).toISOString().split('T')[0],
      high: result.h,
      low: result.l,
      close: result.c
    }));

    return {
      ticker,
      companyName: getCompanyName(ticker),
      days,
      chartData
    };
  } catch (error) {
    throw new Error(`An error occurred while fetching the stock data: ${(error as Error).message}`);
  }
}

const functions = [
  {
    name: "get_stock_graph",
    description: "Get stock price data for a given company name and number of days",
    parameters: {
      type: "object",
      properties: {
        companyName: {
          type: "string",
          description: "The full name of the company in the S&P 500 (e.g., 'Microsoft Corp' instead of just 'Microsoft')"
        },
        days: {
          type: "integer",
          description: "The number of days to retrieve data for"
        }
      },
      required: ["companyName", "days"]
    }
  }
];

export async function POST(req: Request) {
  console.log('OpenAI API route called');
  const startTime = Date.now();

  try {
    const { prompt } = await req.json();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('Calling OpenAI API');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an assistant that helps retrieve stock market data for S&P 500 companies. When asked about a company's stock, use the get_stock_graph function to fetch the data."
        },
        { role: "user", content: prompt }
      ],
      functions: functions,
      function_call: "auto",
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      if (functionName === "get_stock_graph") {
        const ticker = getTicker(functionArgs.companyName);
        if (ticker === "Company not found in S&P 500 list") {
          return NextResponse.json({ error: `Company "${functionArgs.companyName}" not found in S&P 500 list. Please use the full company name.` }, { status: 400 });
        }
        const stockData = await getStockGraph(ticker, functionArgs.days);
        
        console.log(`OpenAI API call completed in ${Date.now() - startTime}ms`);
        console.log(stockData)
        return NextResponse.json(stockData);
      }
    }

    console.log(`OpenAI API call completed in ${Date.now() - startTime}ms`);
    return NextResponse.json({ error: "Unable to process the request" }, { status: 400 });
  } catch (error) {
    console.error('Error in OpenAI API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to process request: ${errorMessage}` }, { status: 500 });
  }
}