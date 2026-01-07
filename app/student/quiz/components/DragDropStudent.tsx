'use client';

import { useState } from 'react';

interface DragDropQuestion {
  prompt: string;
  dragItems: Array<{ id: string; text: string }>;
  zones: Array<{ id: string; name: string; icon?: string }>;
}

export default function DragDropStudent({
  question,
  onAnswer,
  studentAnswers = {},
}: {
  question: DragDropQuestion;
  onAnswer: (answers: Record<string, string[]>) => void;
  studentAnswers?: Record<string, string[]>;
}) {
  const [answers, setAnswers] = useState<Record<string, string[]>>(
    studentAnswers || question.zones.reduce((acc, z) => ({ ...acc, [z.id]: [] }), {})
  );
  const [draggingItem, setDraggingItem] = useState<string | null>(null);

  const handleDragStart = (itemId: string) => {
    setDraggingItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnZone = (zoneId: string) => {
    if (!draggingItem) return;

    const updated = { ...answers };
    
    // Remove from other zones
    Object.keys(updated).forEach(zone => {
      updated[zone] = updated[zone].filter(id => id !== draggingItem);
    });

    // Add to current zone
    if (!updated[zoneId]) updated[zoneId] = [];
    updated[zoneId] = [...updated[zoneId], draggingItem];

    setAnswers(updated);
    onAnswer(updated);
    setDraggingItem(null);
  };

  const getPlacedItems = (zoneId: string) => {
    return answers[zoneId] || [];
  };

  const getAvailableItems = () => {
    const placedIds = new Set(Object.values(answers).flat());
    return question.dragItems.filter(item => !placedIds.has(item.id));
  };

  return (
    <div className="space-y-4">
      {/* Question Prompt */}
      <div className="text-lg font-semibold text-gray-900 mb-4">{question.prompt}</div>

      {/* Available Items */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <p className="text-sm font-semibold text-blue-900 mb-3">Available Items:</p>
        <div className="flex flex-wrap gap-2">
          {getAvailableItems().map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-move hover:bg-blue-700 transition text-sm font-medium"
            >
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Drop Zones */}
      <div className="space-y-3">
        {question.zones.map((zone) => (
          <div
            key={zone.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnZone(zone.id)}
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 min-h-24"
          >
            <p className="text-sm font-semibold text-gray-900 mb-3">
              {zone.icon} {zone.name}
            </p>
            <div className="space-y-2">
              {getPlacedItems(zone.id).length === 0 ? (
                <p className="text-xs text-gray-500">Drop items here</p>
              ) : (
                getPlacedItems(zone.id).map((itemId) => {
                  const item = question.dragItems.find(i => i.id === itemId);
                  return item ? (
                    <div
                      key={itemId}
                      className="px-3 py-2 bg-white rounded border border-blue-300 text-sm text-gray-900 font-medium flex justify-between items-center"
                    >
                      {item.text}
                      <button
                        onClick={() => {
                          const updated = { ...answers };
                          updated[zone.id] = updated[zone.id].filter(id => id !== itemId);
                          setAnswers(updated);
                          onAnswer(updated);
                        }}
                        className="text-red-600 hover:text-red-800 text-xs font-bold ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
