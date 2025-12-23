"use client";

import { useState } from "react";

interface InlineMathToolbarProps {
  isVisible: boolean;
  onInsert: (symbol: string) => void;
}

export default function InlineMathToolbar({ isVisible, onInsert }: InlineMathToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  // Quick access symbols - most commonly used in math
  const quickSymbols = [
    { symbol: "√", label: "√" },
    { symbol: "²", label: "²" },
    { symbol: "³", label: "³" },
    { symbol: "±", label: "±" },
    { symbol: "×", label: "×" },
    { symbol: "÷", label: "÷" },
    { symbol: "≈", label: "≈" },
    { symbol: "≠", label: "≠" },
    { symbol: "≤", label: "≤" },
    { symbol: "≥", label: "≥" },
    { symbol: "∞", label: "∞" },
    { symbol: "π", label: "π" },
  ];

  const moreSymbols = [
    { symbol: "∛", label: "∛", category: "Root" },
    { symbol: "½", label: "½", category: "Fraction" },
    { symbol: "⅓", label: "⅓", category: "Fraction" },
    { symbol: "¼", label: "¼", category: "Fraction" },
    { symbol: "⅔", label: "⅔", category: "Fraction" },
    { symbol: "¾", label: "¾", category: "Fraction" },
    { symbol: "°", label: "°", category: "Angle" },
    { symbol: "∠", label: "∠", category: "Angle" },
    { symbol: "⊥", label: "⊥", category: "Geometry" },
    { symbol: "∥", label: "∥", category: "Geometry" },
    { symbol: "△", label: "△", category: "Geometry" },
    { symbol: "∑", label: "∑", category: "Advanced" },
    { symbol: "∏", label: "∏", category: "Advanced" },
    { symbol: "∫", label: "∫", category: "Advanced" },
    { symbol: "α", label: "α", category: "Greek" },
    { symbol: "β", label: "β", category: "Greek" },
    { symbol: "γ", label: "γ", category: "Greek" },
    { symbol: "δ", label: "δ", category: "Greek" },
    { symbol: "θ", label: "θ", category: "Greek" },
    { symbol: "λ", label: "λ", category: "Greek" },
    { symbol: "σ", label: "σ", category: "Greek" },
  ];

  if (!isVisible) return null;

  const handleSymbolClick = (e: React.MouseEvent<HTMLButtonElement>, symbol: string) => {
    e.preventDefault();
    e.stopPropagation();
    onInsert(symbol);
  };

  const handleExpandClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div 
      className="bg-white border border-purple-200 rounded-lg shadow-lg p-3 mb-3 pointer-events-auto"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Quick Symbols */}
      <div className="flex flex-wrap gap-1 mb-2">
        {quickSymbols.map((item) => (
          <button
            key={item.symbol}
            type="button"
            onMouseDown={(e) => handleSymbolClick(e, item.symbol)}
            title={item.label}
            className="w-9 h-9 flex items-center justify-center bg-purple-50 hover:bg-purple-200 border border-purple-300 rounded font-bold text-sm text-purple-700 transition-colors cursor-pointer"
          >
            {item.symbol}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={handleExpandClick}
          className="w-9 h-9 flex items-center justify-center bg-purple-600 hover:bg-purple-700 border border-purple-600 rounded text-white transition-colors cursor-pointer"
          title="More symbols"
        >
          <i className={`ri-arrow-${expanded ? "up" : "down"}-s-line`}></i>
        </button>
      </div>

      {/* Expanded Symbols - Always show all available symbols */}
      {expanded && (
        <div className="border-t border-purple-200 pt-3">
          <div className="text-xs text-gray-600 mb-3 font-semibold">More Symbols</div>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
            {moreSymbols.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onMouseDown={(e) => handleSymbolClick(e, item.symbol)}
                title={`${item.label} (${item.category})`}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-purple-100 border border-gray-300 hover:border-purple-400 rounded text-xs font-bold text-gray-700 hover:text-purple-700 transition-colors cursor-pointer"
              >
                {item.symbol}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-3 text-center">💡 Click a symbol to insert it</div>
    </div>
  );
}
