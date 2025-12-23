"use client";

import { useState } from "react";

interface UrduKeyboardProps {
  isVisible: boolean;
  onInsert: (character: string) => void;
}

export default function UrduKeyboard({ isVisible, onInsert }: UrduKeyboardProps) {
  const [expanded, setExpanded] = useState(false);

  // Quick access Urdu letters - most common
  const quickCharacters = [
    { char: "ا", label: "Alif" },
    { char: "ب", label: "Bey" },
    { char: "پ", label: "Pay" },
    { char: "ت", label: "Tey" },
    { char: "ث", label: "Sey" },
    { char: "ج", label: "Jim" },
    { char: "چ", label: "Chay" },
    { char: "ح", label: "Hah" },
    { char: "خ", label: "Khah" },
    { char: "د", label: "Dal" },
    { char: "ڈ", label: "Ddal" },
    { char: "ر", label: "Ray" },
  ];

  const moreCharacters = [
    // More consonants
    { char: "ز", label: "Zay", category: "Consonants" },
    { char: "ژ", label: "Zhay", category: "Consonants" },
    { char: "س", label: "Seen" },
    { char: "ش", label: "Sheen", category: "Consonants" },
    { char: "ص", label: "Saad", category: "Consonants" },
    { char: "ض", label: "Daad", category: "Consonants" },
    { char: "ط", label: "Tah", category: "Consonants" },
    { char: "ظ", label: "Zah", category: "Consonants" },
    { char: "ع", label: "Ain", category: "Consonants" },
    { char: "غ", label: "Ghain", category: "Consonants" },
    { char: "ف", label: "Fey", category: "Consonants" },
    { char: "ق", label: "Qaf", category: "Consonants" },
    { char: "ک", label: "Kaf", category: "Consonants" },
    { char: "گ", label: "Gaff", category: "Consonants" },
    { char: "ل", label: "Lam", category: "Consonants" },
    { char: "م", label: "Meem", category: "Consonants" },
    { char: "ن", label: "Noon", category: "Consonants" },
    { char: "ں", label: "Noon Ghunna", category: "Consonants" },
    { char: "و", label: "Waw", category: "Vowels" },
    { char: "ہ", label: "Heh", category: "Consonants" },
    { char: "ء", label: "Hamza", category: "Special" },
    { char: "ئ", label: "Yeh Hamza", category: "Special" },
    { char: "ؤ", label: "Waw Hamza", category: "Special" },
    { char: "ۓ", label: "Yeh Barree Hamza", category: "Special" },
    { char: "ۂ", label: "Heh Goal", category: "Special" },
    { char: "ی", label: "Yeh", category: "Vowels" },
    { char: "ے", label: "Yeh Barree", category: "Vowels" },
    // Common words
    { char: "اور", label: "Aur (and)", category: "Common Words" },
    { char: "یا", label: "Ya (or)", category: "Common Words" },
    { char: "کہ", label: "Kah (that)", category: "Common Words" },
    { char: "جو", label: "Jo (who)", category: "Common Words" },
    { char: "تو", label: "To (then)", category: "Common Words" },
    { char: "سے", label: "Say (from)", category: "Common Words" },
    { char: "میں", label: "Mein (in)", category: "Common Words" },
    { char: "ہے", label: "Hai (is)", category: "Common Words" },
    { char: "نہیں", label: "Nahi (no)", category: "Common Words" },
    { char: "ہاں", label: "Haan (yes)", category: "Common Words" },
  ];

  if (!isVisible) return null;

  const handleCharClick = (e: React.MouseEvent<HTMLButtonElement>, char: string) => {
    e.preventDefault();
    e.stopPropagation();
    onInsert(char);
  };

  const handleExpandClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div 
      className="bg-white border border-emerald-200 rounded-lg shadow-lg p-3 mb-3 pointer-events-auto"
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Quick Characters */}
      <div className="flex flex-wrap gap-1 mb-2">
        {quickCharacters.map((item) => (
          <button
            key={item.char}
            type="button"
            onMouseDown={(e) => handleCharClick(e, item.char)}
            title={item.label}
            className="w-9 h-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-200 border border-emerald-300 rounded font-bold text-base text-emerald-700 transition-colors cursor-pointer"
          >
            {item.char}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={handleExpandClick}
          className="w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 rounded text-white transition-colors cursor-pointer"
          title="More characters"
        >
          <i className={`ri-arrow-${expanded ? "up" : "down"}-s-line`}></i>
        </button>
      </div>

      {/* Expanded Characters */}
      {expanded && (
        <div className="border-t border-emerald-200 pt-3">
          <div className="text-xs text-gray-600 mb-3 font-semibold">More Characters</div>
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
            {moreCharacters.map((item) => (
              <button
                key={item.char}
                type="button"
                onMouseDown={(e) => handleCharClick(e, item.char)}
                title={item.label}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-emerald-100 border border-gray-300 hover:border-emerald-400 rounded text-xs font-bold text-gray-700 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {item.char}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-3 text-center">🇵🇰 Click a character to insert it</div>
    </div>
  );
}
