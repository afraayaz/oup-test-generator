'use client';

import { useState } from 'react';

interface OrderingQuestion {
  prompt: string;
  items: Array<{ id: string; text: string }>;
}

export default function OrderingStudent({
  question,
  onAnswer,
  studentAnswers = [],
}: {
  question: OrderingQuestion;
  onAnswer: (answers: string[]) => void;
  studentAnswers?: string[];
}) {
  const [orderedItems, setOrderedItems] = useState<string[]>(
    studentAnswers && studentAnswers.length > 0 ? studentAnswers : question.items.map(i => i.id)
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnItem = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = orderedItems.indexOf(draggedItem);
    const targetIndex = orderedItems.indexOf(targetId);

    const updated = [...orderedItems];
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setOrderedItems(updated);
    onAnswer(updated);
    setDraggedItem(null);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= orderedItems.length) return;

    const updated = [...orderedItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    setOrderedItems(updated);
    onAnswer(updated);
  };

  return (
    <div className="space-y-4">
      {/* Question Prompt */}
      <div className="text-lg font-semibold text-gray-900 mb-4">{question.prompt}</div>

      {/* Ordering Container */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-4">Drag items to reorder, or use the arrow buttons</p>
        
        <div className="space-y-2">
          {orderedItems.map((itemId, index) => {
            const item = question.items.find(i => i.id === itemId);
            return item ? (
              <div
                key={itemId}
                draggable
                onDragStart={() => handleDragStart(itemId)}
                onDragOver={handleDragOver}
                onDrop={() => handleDropOnItem(itemId)}
                className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-move hover:bg-blue-100 transition"
              >
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <p className="flex-1 text-sm font-medium text-gray-900">{item.text}</p>
                
                <div className="flex gap-1">
                  <button
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === orderedItems.length - 1}
                    className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
