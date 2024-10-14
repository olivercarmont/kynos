"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { useTheme } from 'next-themes';
import { Input } from "@/components/ui/input";

interface Stock {
  symbol: string;
  name: string;
}

type FuseResultMatch = {
  indices: readonly [number, number][];
  key?: string;
  refIndex?: number;
  value?: string;
}

type FuseResult = {
  item: Stock;
  refIndex: number;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

interface StockSearchProps {
  onSelectStock: (stock: Stock) => void;
  initialValue?: string;
  clearOnFocus?: boolean;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock, initialValue = '', clearOnFocus = false }) => {
  const [search, setSearch] = useState(initialValue);
  const [results, setResults] = useState<FuseResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fuse = useRef<Fuse<Stock> | null>(null);

  const initFuse = useCallback((stocksData: Stock[]) => {
    fuse.current = new Fuse(stocksData, {
      keys: ['symbol', 'name'],
      threshold: 0.3,
      ignoreLocation: true,
      includeMatches: true,
      shouldSort: true,
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    const cachedStocks = localStorage.getItem('stockSymbols');
    if (cachedStocks) {
      const parsedStocks = JSON.parse(cachedStocks);
      initFuse(parsedStocks);
    } else {
      // If no cached stocks, fetch from API (this should happen rarely)
      fetch('/api/stocks')
        .then(response => response.json())
        .then(fetchedStocks => {
          const formattedStocks = fetchedStocks.map((stock: Stock) => ({
            symbol: stock.symbol.toUpperCase(),
            name: stock.name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
          }));
          localStorage.setItem('stockSymbols', JSON.stringify(formattedStocks));
          initFuse(formattedStocks);
        })
        .catch(error => console.error('Failed to fetch stocks:', error));
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [initFuse]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (fuse.current && text) {
      const searchResults = fuse.current.search(text);
      setResults(searchResults.slice(0, 10) as FuseResult[]); // Type assertion here
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

  const highlightMatches = (text: string, matches: readonly FuseResultMatch[] | undefined) => {
    if (!matches || matches.length === 0) return text;
    
    const sortedMatches = [...matches].sort((a, b) => (a.indices[0][0] || 0) - (b.indices[0][0] || 0));
    let lastIndex = 0;
    const parts = [];

    sortedMatches.forEach((match) => {
      match.indices.forEach(([start, end]) => {
        if (start > lastIndex) {
          parts.push(text.slice(lastIndex, start));
        }
        parts.push(<span key={start} className="font-semibold">{text.slice(start, end + 1)}</span>);
        lastIndex = end + 1;
      });
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
            const symbolMatches = result.matches?.find(m => m.key === 'symbol');
            const nameMatches = result.matches?.find(m => m.key === 'name');
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
                <span className="font-medium">{highlightMatches(result.item.symbol, symbolMatches ? [symbolMatches] : undefined)}</span>
                <span className="ml-2 text-gray-500">{highlightMatches(result.item.name, nameMatches ? [nameMatches] : undefined)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StockSearch;