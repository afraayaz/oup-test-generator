"use client";

import { useState } from "react";

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MathKeyboard({ onInsert, isOpen, onClose }: MathKeyboardProps) {
  const [selectedCategory, setSelectedCategory] = useState<"basic" | "advanced" | "greek">("basic");

  const mathSymbols = {
    basic: [
      { symbol: "√", label: "√ (Square Root)" },
      { symbol: "∛", label: "∛ (Cube Root)" },
      { symbol: "²", label: "² (Squared)" },
      { symbol: "³", label: "³ (Cubed)" },
      { symbol: "ⁿ", label: "ⁿ (Power)" },
      { symbol: "±", label: "± (Plus/Minus)" },
      { symbol: "×", label: "× (Multiply)" },
      { symbol: "÷", label: "÷ (Divide)" },
      { symbol: "≈", label: "≈ (Approx)" },
      { symbol: "≠", label: "≠ (Not Equal)" },
      { symbol: "≤", label: "≤ (Less/Equal)" },
      { symbol: "≥", label: "≥ (Greater/Equal)" },
      { symbol: "∞", label: "∞ (Infinity)" },
      { symbol: "∑", label: "∑ (Summation)" },
      { symbol: "∏", label: "∏ (Product)" },
      { symbol: "∫", label: "∫ (Integral)" },
    ],
    advanced: [
      { symbol: "½", label: "½ (One Half)" },
      { symbol: "⅓", label: "⅓ (One Third)" },
      { symbol: "¼", label: "¼ (One Quarter)" },
      { symbol: "⅔", label: "⅔ (Two Thirds)" },
      { symbol: "¾", label: "¾ (Three Quarters)" },
      { symbol: "°", label: "° (Degree)" },
      { symbol: "′", label: "′ (Minute)" },
      { symbol: "″", label: "″ (Second)" },
      { symbol: "∠", label: "∠ (Angle)" },
      { symbol: "⊥", label: "⊥ (Perpendicular)" },
      { symbol: "∥", label: "∥ (Parallel)" },
      { symbol: "△", label: "△ (Triangle)" },
      { symbol: "◯", label: "◯ (Circle)" },
      { symbol: "→", label: "→ (Arrow)" },
      { symbol: "↔", label: "↔ (Double Arrow)" },
      { symbol: "⊆", label: "⊆ (Subset)" },
    ],
    greek: [
      { symbol: "α", label: "α (Alpha)" },
      { symbol: "β", label: "β (Beta)" },
      { symbol: "γ", label: "γ (Gamma)" },
      { symbol: "δ", label: "δ (Delta)" },
      { symbol: "ε", label: "ε (Epsilon)" },
      { symbol: "ζ", label: "ζ (Zeta)" },
      { symbol: "η", label: "η (Eta)" },
      { symbol: "θ", label: "θ (Theta)" },
      { symbol: "λ", label: "λ (Lambda)" },
      { symbol: "μ", label: "μ (Mu)" },
      { symbol: "π", label: "π (Pi)" },
      { symbol: "ρ", label: "ρ (Rho)" },
      { symbol: "σ", label: "σ (Sigma)" },
      { symbol: "τ", label: "τ (Tau)" },
      { symbol: "φ", label: "φ (Phi)" },
      { symbol: "ψ", label: "ψ (Psi)" },
    ],
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Math Keyboard</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-200 bg-gray-50">
          {(["basic", "advanced", "greek"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-purple-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {cat === "basic" && "Basic"}
              {cat === "advanced" && "Advanced"}
              {cat === "greek" && "Greek"}
            </button>
          ))}
        </div>

        {/* Symbols Grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mathSymbols[selectedCategory].map((item) => (
              <button
                key={item.symbol}
                onClick={() => {
                  onInsert(item.symbol);
                  onClose();
                }}
                title={item.label}
                className="flex flex-col items-center justify-center p-3 bg-gray-100 hover:bg-purple-100 border-2 border-gray-200 hover:border-purple-600 rounded-lg transition-all duration-200 group"
              >
                <span className="text-2xl font-bold text-gray-700 group-hover:text-purple-600 mb-1">
                  {item.symbol}
                </span>
                <span className="text-xs text-gray-500 group-hover:text-purple-600 text-center line-clamp-1">
                  {item.label.split("(")[1]?.slice(0, -1) || item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-600">
          <p>💡 Click a symbol to insert it into your text</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
