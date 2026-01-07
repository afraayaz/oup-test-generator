'use client';

import { useState } from 'react';

interface MatchingQuestion {
  prompt: string;
  leftItems: Array<{ id: string; text: string }>;
  rightItems: Array<{ id: string; text: string }>;
}

export default function MatchingStudent({
  question,
  onAnswer,
  studentAnswers = {},
}: {
  question: MatchingQuestion;
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(studentAnswers || {});

  const handleMatch = (leftId: string, rightId: string) => {
    const updated = { ...answers, [leftId]: rightId };
    setAnswers(updated);
    onAnswer(updated);
  };

  const getRightItemForLeft = (leftId: string) => {
    return answers[leftId] || null;
  };

  return (
    <div className="space-y-4">
      {/* Question Prompt */}
      <div className="text-lg font-semibold text-gray-900 mb-4">{question.prompt}</div>

      {/* Matching Container */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-2">
            {question.leftItems.map((item) => (
              <div key={item.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-900">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Right Column with Matching */}
          <div className="space-y-2">
            {question.leftItems.map((leftItem) => (
              <select
                key={leftItem.id}
                value={getRightItemForLeft(leftItem.id) || ''}
                onChange={(e) => handleMatch(leftItem.id, e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">-- Select --</option>
                {question.rightItems.map((rightItem) => (
                  <option key={rightItem.id} value={rightItem.id}>
                    {rightItem.text}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        {/* Preview of Connections */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-semibold text-gray-900 mb-2">Your Matches:</p>
          <div className="space-y-1">
            {question.leftItems.map((leftItem) => {
              const rightId = getRightItemForLeft(leftItem.id);
              const rightText = question.rightItems.find(r => r.id === rightId)?.text || 'Not matched';
              return (
                <div key={leftItem.id} className="text-sm text-gray-700">
                  <span className="font-medium">{leftItem.text}</span> → <span className="text-blue-600">{rightText}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
