'use client';

import { useState } from 'react';

interface CategorizationQuestion {
  prompt: string;
  categories: Array<{ id: string; name: string }>;
  items: Array<{ id: string; text: string }>;
}

export default function CategorizationStudent({
  question,
  onAnswer,
  studentAnswers = {},
}: {
  question: CategorizationQuestion;
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(studentAnswers || {});

  const handleCategoryChange = (itemId: string, categoryId: string) => {
    const updated = { ...answers, [itemId]: categoryId };
    setAnswers(updated);
    onAnswer(updated);
  };

  const getItemsForCategory = (categoryId: string) => {
    return question.items.filter(item => answers[item.id] === categoryId);
  };

  return (
    <div className="space-y-4">
      {/* Question Prompt */}
      <div className="text-lg font-semibold text-gray-900 mb-4">{question.prompt}</div>

      {/* Items to Categorize */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-3">Items to Categorize:</p>
        <div className="grid grid-cols-2 gap-2">
          {question.items.map((item) => (
            <div key={item.id} className="p-3 bg-white rounded border border-blue-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!answers[item.id]}
                  onChange={() => {}}
                  className="w-4 h-4"
                />
                <span className="flex-1 text-sm font-medium text-gray-900">{item.text}</span>
              </label>
              
              <select
                value={answers[item.id] || ''}
                onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select Category --</option>
                {question.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Category Preview */}
      <div className="space-y-2">
        {question.categories.map((category) => (
          <div key={category.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-2">{category.name}</p>
            <div className="space-y-1">
              {getItemsForCategory(category.id).length === 0 ? (
                <p className="text-xs text-gray-500">No items assigned</p>
              ) : (
                getItemsForCategory(category.id).map((item) => (
                  <div key={item.id} className="text-sm text-gray-700 ml-2">
                    • {item.text}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
