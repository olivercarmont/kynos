"use client"

import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { useTheme } from 'next-themes';
import { Input } from "@/components/ui/input";
import { ChevronDown } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
}

interface FuseResult extends Fuse.FuseResult<Stock> {
  matches?: Array<{
    indices: Array<[number, number]>;
    key: string;
  }>;
}

interface StockSearchProps {
  onSelectStock: (stock: Stock) => void;
  initialValue?: string;
  clearOnFocus?: boolean;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock, initialValue = '', clearOnFocus = false }) => {
  const [search, setSearch] = useState(initialValue);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [results, setResults] = useState<FuseResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fuse = useRef<Fuse<Stock> | null>(null);

  useEffect(() => {
    setMounted(true);
    loadStocks();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadStocks = async () => {
    const cachedStocks = localStorage.getItem('stockSymbols');
    if (cachedStocks) {
      const parsedStocks = JSON.parse(cachedStocks);
      setStocks(parsedStocks);
      initFuse(parsedStocks);
    } else {
      try {
        const response = await fetch('/api/stocks');
        const fetchedStocks = await response.json();
        setStocks(fetchedStocks);
        localStorage.setItem('stockSymbols', JSON.stringify(fetchedStocks));
        initFuse(fetchedStocks);
      } catch (error) {
        console.error('Failed to fetch stocks:', error);
      }
    }
  };

  const initFuse = (stocksData: Stock[]) => {
    fuse.current = new Fuse(stocksData, {
      keys: ['symbol', 'name'],
      threshold: 0.3,
      ignoreLocation: true,
      includeMatches: true,
      shouldSort: true,
      sortFn: (a, b) => {
        const aSymbol = a.item?.symbol || '';
        const bSymbol = b.item?.symbol || '';
        if (a.score === b.score) {
          return aSymbol.length - bSymbol.length;
        }
        return (a.score || 0) - (b.score || 0);
      }
    });
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    if (fuse.current && text) {
      const searchResults = fuse.current.search(text);
      setResults(searchResults.slice(0, 5));
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleInputFocus = () => {
    if (clearOnFocus) {
      setSearch('');
    }
    if (search.trim() !== '') {
      setShowResults(true);
    }
  };

  const handleInputClick = () => {
    if (clearOnFocus) {
      setSearch('');
    }
    setShowResults(true);
  };

  const handleSelectStock = (stock: Stock) => {
    setSearch(`${stock.name} (${stock.symbol})`);
    setShowResults(false);
    onSelectStock(stock);
  };

  const highlightMatches = (text: string, matches: Array<[number, number]>) => {
    let lastIndex = 0;
    const parts = [];

    matches.forEach(([start, end]) => {
      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }
      parts.push(<span key={start} className="font-semibold">{text.slice(start, end + 1)}</span>);
      lastIndex = end + 1;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  if (!mounted) return null;

  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDarkTheme = currentTheme === 'dark';

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Input 
          placeholder="e.g. Apple" 
          type="text"
          value={search}
          onClick={handleInputClick}  
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          className="h-12 w-full text-base tracking-tight transition-all duration-100 ease-in-out focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:ring-offset-0 focus-visible:outline-none"
        />
      </div>

      {showResults && results.length > 0 && (
        <ul className={`absolute z-10 w-full mt-1 border rounded-md shadow-lg ${
          isDarkTheme ? 'bg-gray-800 text-white' : 'bg-white text-black'
        }`}>
          {results.map((result, index) => {
            const symbolMatches = result.matches?.find(m => m.key === 'symbol')?.indices || [];
            const nameMatches = result.matches?.find(m => m.key === 'name')?.indices || [];
            return (
              <li 
                key={index} 
                className={`px-3 py-2 cursor-pointer text-sm ${
                  isDarkTheme 
                    ? 'hover:bg-gray-700' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSelectStock(result.item)}
              >
                <span className="font-medium">{highlightMatches(result.item.symbol, symbolMatches)}</span>
                <span className="ml-2 text-gray-500">{highlightMatches(result.item.name, nameMatches)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StockSearch;