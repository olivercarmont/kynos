"use client";

import React, { useState, useMemo } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingDown, TrendingUp } from "lucide-react";

interface ChartData {
  date: string;
  close: number;
}

interface StockData {
  ticker: string;
  companyName: string;
  days: number;
  chartData: ChartData[];
}

const GREEN_COLOR = "#0cf0a8";
const RED_COLOR = "#E2366F";
const GREY_COLOR = "#808080";

export const InteractiveStockChart: React.FC = () => {
  const [input, setInput] = useState("");
  const [chartData, setChartData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setChartData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formattedData = useMemo(() => 
    chartData?.chartData.map((item: ChartData) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })),
    [chartData]
  );

  const yAxisDomain = useMemo((): [number, number] => {
    if (!formattedData || formattedData.length === 0) return [0, 100]; // Default domain
    const allValues = formattedData.map(item => item.close);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;
    return [Math.floor(minValue - padding), Math.ceil(maxValue + padding)];
  }, [formattedData]);

  const percentageChange = useMemo(() => {
    if (!chartData || chartData.chartData.length < 2) return 0;
    const firstClose = chartData.chartData[0].close;
    const lastClose = chartData.chartData[chartData.chartData.length - 1].close;
    return ((lastClose - firstClose) / firstClose) * 100;
  }, [chartData]);

  const lineColor = useMemo(() => {
    if (percentageChange > 0) return GREEN_COLOR;
    if (percentageChange < 0) return RED_COLOR;
    return GREY_COLOR;
  }, [percentageChange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const originalDate = chartData?.chartData.find(item => new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === label)?.date;
      const date = originalDate ? new Date(originalDate) : new Date();
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-black dark:text-white mb-2">
            {date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="flex items-center">
            <div className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: lineColor }}></div>
            <p className="font-bold">${payload[0].value.toFixed(2)}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className='w-full max-w-[1800px] mx-auto'>
      <CardHeader className='flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6'>
          <CardTitle>{chartData?.ticker || "Enter a stock"}</CardTitle>
          <CardDescription>{chartData?.companyName || "Enter a company name and timeframe"}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className='px-2 sm:p-6'>
        
        <div className="flex items-center space-x-2 mb-4">
          <Input 
            placeholder="e.g. Apple, last year" 
            value={input}
            onChange={handleInputChange}
            className="h-12 text-base tracking-tight transition-all duration-100 ease-in-out focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 focus-visible:outline-none"
          />
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 transition-colors"
          >
            {loading ? 'Loading...' : 'Generate'}
          </Button>
          <br/>
          
        </div>
        {!chartData ? <CardDescription className='mt-7'>Disclaimer: Max timeframe is 2 years</CardDescription> : ''}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {chartData && (
          <div className='aspect-[16/9] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart
                data={formattedData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 10,
                }}>
                <XAxis
                  dataKey='date'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis
            domain={yAxisDomain}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="close" stroke={lineColor} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
      {chartData && (
        <CardFooter className='flex-col items-start gap-2 text-sm pt-0'>
          <div className='font-medium leading-none'>
            {percentageChange > 0 ? (
              <>
                Trending up by{" "}
                <span style={{ color: GREEN_COLOR }}>
                  {percentageChange.toFixed(2)}%{" "}
                </span>{" "}
                this period{" "}
                <TrendingUp style={{ color: GREEN_COLOR }} className='inline h-4 w-4' />
              </>
            ) : percentageChange < 0 ? (
              <>
                Trending down by{" "}
                <span style={{ color: RED_COLOR }}>
                  {Math.abs(percentageChange).toFixed(2)}%{" "}
                </span>{" "}
                this period{" "}
                <TrendingDown style={{ color: RED_COLOR }} className='inline h-4 w-4' />
              </>
            ) : (
              <>Unchanged this period</>
            )}
          </div>
          {chartData.days < 730 ?
          <div className='leading-none text-muted-foreground'>
          Showing stock data for the last {chartData.days} days
          </div> :
           <div className='leading-none text-muted-foreground'>
           Showing stock data for the last 2 years (Max)
           </div>}

        </CardFooter>
      )}
    </Card>
  );
};