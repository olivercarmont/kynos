import fs from 'fs';
import path from 'path';

interface RawStock {
  cik_str: number;
  ticker: string;
  title: string;
}

interface Stock {
  symbol: string;
  name: string;
}

export function parseTickerList(): Stock[] {
  const filePath = path.join(process.cwd(), 'ticker-list.json');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const rawData: { [key: string]: RawStock } = JSON.parse(fileContent);

  return Object.values(rawData).map(stock => ({
    symbol: stock.ticker,
    name: stock.title
  }));
}