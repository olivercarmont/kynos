import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getTicker } from '@/app/sp500_tickers';
import { getStockData } from '@/lib/get-stock-data';

const functions = [
  {
    name: "get_stock_graph",
    description: "Get stock market data for a company",
    parameters: {
      type: "object",
      properties: {
        companyName: {
          type: "string",
          description: "The name of the company",
        },
        days: {
          type: "number",
          description: "Number of days of data to retrieve",
        },
      },
      required: ["companyName"],
    },
  },
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
          content: "You are an assistant that helps retrieve stock market data for S&P 500 companies. When asked about a company's stock, use the get_stock_graph function to fetch the data. convert the timeframe to number of days. If no timeframe is specified, use the last year (365 days) as the default."
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
          return NextResponse.json({ error: `Company "${functionArgs.companyName}" not found in S&P 500 list. Please check the company name and try again.` }, { status: 400 });
        }
        
        // Use 365 days (last year) as default if days is not specified or is 0
        const days = functionArgs.days && functionArgs.days > 0 ? functionArgs.days : 365;
        
        const stockData = await getStockData(ticker, days);
        
        // Filter the last 'days' of data
        const filteredData = stockData.slice(-days);
        
        const result = {
          ticker,
          companyName: functionArgs.companyName,
          days,
          chartData: filteredData
        };
        
        console.log(`OpenAI API call completed in ${Date.now() - startTime}ms`);
        // console.log(result);
        return NextResponse.json(result);
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