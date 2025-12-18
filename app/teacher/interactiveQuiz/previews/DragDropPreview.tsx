"use client";
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";
import { DragDropQuestion, DragItem, DropZone } from "@/types/types";

type Props = {
  question: DragDropQuestion;
};

export default function DragDropPreview({ question }: Props) {
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [showAnswers, setShowAnswers] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over) {
      setAssigned((prev) => ({
  ...prev,
  [String(over.id)]: String(active.id),
}));

    }
  };

  const resetAnswers = () => {
    setAssigned({});
    setShowAnswers(false);
  };

  const getFeedback = (zone: DropZone) => {
    const assignedId = assigned[zone.id];
    if (!assignedId) return null;

    return assignedId === zone.correctItemId ? (
      <span className="text-green-600 font-semibold">✅ Correct</span>
    ) : (
      <span className="text-red-500 font-semibold">❌ Incorrect</span>
    );
  };

  const getCorrectLabel = (zone: DropZone) => {
    const correctItem = question.dragItems.find((item) => item.id === zone.correctItemId);
    return correctItem?.label || "—";
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800">🧪 {question.prompt}</h3>

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <button
          onClick={resetAnswers}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          🔄 Reset
        </button>
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showAnswers ? "🙈 Hide Answers" : "👀 Show Answers"}
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Drop Zones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {question.dropZones.map((zone) => (
            <DropSlot
              key={zone.id}
              zone={zone}
              assignedItem={question.dragItems.find((i) => i.id === assigned[zone.id])}
              showAnswers={showAnswers}
              feedback={getFeedback(zone)}
              correctLabel={getCorrectLabel(zone)}
            />
          ))}
        </div>

        {/* Draggable Items */}
        <div className="flex flex-wrap gap-4 mt-6">
          {question.dragItems.map((item) => (
            <DraggableItem key={item.id} item={item} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DraggableItem({ item }: { item: DragItem }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="bg-blue-500 text-white px-3 py-2 rounded shadow cursor-move"
    >
      {item.label}
    </div>
  );
}

function DropSlot({
  zone,
  assignedItem,
  showAnswers,
  feedback,
  correctLabel,
}: {
  zone: DropZone;
  assignedItem?: DragItem;
  showAnswers: boolean;
  feedback: React.ReactNode;
  correctLabel: string;
}) {
  const { setNodeRef } = useDroppable({ id: zone.id });

  return (
    <div
      ref={setNodeRef}
      className="border p-4 rounded bg-gray-100 min-h-[60px] space-y-2"
    >
      <p className="font-medium">{zone.label}</p>

      {assignedItem && (
        <div
          className={`px-2 py-1 rounded ${
            assignedItem.id === zone.correctItemId ? "bg-green-200" : "bg-red-200"
          }`}
        >
          {assignedItem.label}
        </div>
      )}

      {showAnswers && (
        <p className="text-sm text-gray-600">
          Correct: <strong>{correctLabel}</strong>
        </p>
      )}

      {feedback}
    </div>
  );
}
