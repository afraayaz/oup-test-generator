"use client";
import { useState, useEffect } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import { OrderingQuestion, QuizItem } from "@/types/types";

type Props = {
  question: OrderingQuestion;
};

export default function OrderingPreview({ question }: Props) {
  const [steps, setSteps] = useState<QuizItem[]>(question.steps || []);

  // Reset steps when question changes (when items are added/removed in builder)
  useEffect(() => {
    const steps = question.steps || [];
    // Shuffle the steps for the preview (but keep consistent during the session)
    const shuffledSteps = [...steps].sort(() => Math.random() - 0.5);
    setSteps(shuffledSteps);
  }, [question.steps?.length || 0]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((i) => i.id === active.id);
    const newIndex = steps.findIndex((i) => i.id === over.id);

    const updated = [...steps];
    const [moved] = updated.splice(oldIndex, 1);
    updated.splice(newIndex, 0, moved);

    setSteps(updated);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Question Prompt */}
      {question.prompt && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sequence Ordering</h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            {question.prompt}
          </p>
        </div>
      )}

      {/* Ordering Interface */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-purple-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Arrange in Correct Order
              <span className="text-sm text-gray-500">({steps.length} items)</span>
            </h3>
          </div>
        </div>

        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <ul className="space-y-4 max-w-2xl mx-auto">
            {steps.map((step, idx) => (
              <OrderingSlot key={step.id} step={step} index={idx + 1} />
            ))}
          </ul>
          
          {steps.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔢</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Steps Yet</h3>
              <p className="text-gray-500">Add sequence items in the builder to see them here for ordering.</p>
            </div>
          )}
        </DndContext>

        {/* Instructions */}
        {steps.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full text-sm text-gray-600">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Drag and drop to arrange items in the correct sequence
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderingSlot({ step, index }: { step: QuizItem; index: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: step.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: step.id });

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        setDropRef(el);
      }}
      {...listeners}
      {...attributes}
      className={`relative bg-white border-2 border-purple-200 px-6 py-4 rounded-xl shadow-sm cursor-move hover:shadow-lg transition-all duration-200 flex items-center gap-4 select-none ${
        isDragging 
          ? "opacity-50 scale-105 border-purple-400 shadow-xl z-10" 
          : "hover:border-purple-300 hover:scale-102"
      }`}
    >
      {/* Drag Handle */}
      <div className="flex-shrink-0 text-purple-400">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="5" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="5" cy="10" r="1.5" />
          <circle cx="15" cy="10" r="1.5" />
          <circle cx="5" cy="15" r="1.5" />
          <circle cx="15" cy="15" r="1.5" />
        </svg>
      </div>

      {/* Order Number */}
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
        {index}
      </div>

      {/* Step Content */}
      <div className="flex-1">
        <span className="font-semibold text-gray-800 text-lg">{step.label}</span>
      </div>

      {/* Visual indicator for dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-100 border-2 border-purple-400 rounded-xl opacity-50 pointer-events-none"></div>
      )}
    </li>
  );
}
