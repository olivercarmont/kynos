const BASE_URL = `https://api.polygon.io/v2/aggs/ticker/TICKER/range/1/day/FROM_DATE/TO_DATE?adjusted=true&sort=asc&limit=50000&apiKey=${process.env.POLYGON_API_KEY}`;

export const getAugmentedFetchUrl = (
  ticker: string,
  from: string,
  to: string
) =>
  BASE_URL.replace("TICKER", ticker)
    .replace("FROM_DATE", from)
    .replace("TO_DATE", to);

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getEndpoint = (ticker: string, days: number = 365): string => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const from = formatDate(startDate);
  const to = formatDate(today);

  return getAugmentedFetchUrl(ticker, from, to);
};

export interface StockData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getStockData(
  ticker: string = "NVDA",
  days: number = 365
): Promise<StockData[]> {
  const res = await fetch(getEndpoint(ticker, days), {
    headers: {
      "Content-Type": "application/json",
    },
    next: {
      revalidate: 60,
    },
  });

  const data = await res.json();

  if (!data.results || !Array.isArray(data.results)) {
    throw new Error("Failed to fetch stock data");
  }

  const stockDataArray: StockData[] = data.results.map((item: any) => ({
    date: new Date(item.t).toISOString().split("T")[0], // Convert timestamp to YYYY-MM-DD
    open: item.o,
    high: item.h,
    low: item.l,
    close: item.c,
    volume: item.v,
  }));

  return stockDataArray;
}