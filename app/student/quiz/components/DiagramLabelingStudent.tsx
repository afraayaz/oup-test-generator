'use client';

import { useState } from 'react';

interface DiagramLabelingQuestion {
  prompt: string;
  backgroundImage: string;
  dragItems: Array<{ id: string; text: string; x: number; y: number }>;
}

export default function DiagramLabelingStudent({
  question,
  onAnswer,
  studentAnswers = {},
}: {
  question: DiagramLabelingQuestion;
  onAnswer: (answers: Record<string, string>) => void;
  studentAnswers?: Record<string, string>;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(studentAnswers || {});

  const handleAnswerChange = (id: string, value: string) => {
    const updated = { ...answers, [id]: value };
    setAnswers(updated);
    onAnswer(updated);
  };

  return (
    <div className="space-y-4">
      {/* Question Prompt */}
      <div className="text-lg font-semibold text-gray-900 mb-4">{question.prompt}</div>

      {/* Diagram with Numbered Dots */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="relative inline-block mx-auto mb-4" style={{ maxHeight: '350px', maxWidth: '100%' }}>
          <img src={question.backgroundImage} alt="Diagram" className="max-h-96 h-auto rounded" />
          
          {/* Show numbered circles at marked positions */}
          {question.dragItems.map((item, idx) => (
            <div
              key={item.id}
              className="absolute w-8 h-8 bg-blue-600 text-white rounded-full transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-sm pointer-events-none shadow-lg border-2 border-blue-800"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Answer Input Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">Write answers for each marked area:</p>
        
        <div className="space-y-3">
          {question.dragItems.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                {idx + 1}
              </div>
              <input
                type="text"
                value={answers[item.id] || ''}
                onChange={(e) => handleAnswerChange(item.id, e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
