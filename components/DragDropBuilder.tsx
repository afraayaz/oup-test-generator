import { useState, useEffect } from "react";
import { DragDropQuestion, DragItem, DropZone } from "@/types/types";

type Props = {
  question: DragDropQuestion;
  onUpdate: (updated: DragDropQuestion) => void;
};

export default function DragDropBuilder({ question, onUpdate }: Props) {
  const [dragItems, setDragItems] = useState<DragItem[]>(question.dragItems || []);
  const [dropZones, setDropZones] = useState<DropZone[]>(question.dropZones || []);

  useEffect(() => {
    onUpdate({ 
      ...question, 
      dragItems, 
      dropZones,
      feedbackConfig: question.feedbackConfig || {
        showInstant: false,
        correctMessage: "Correct! Well done!",
        incorrectMessage: "Not quite right. Try again!",
        showCorrectAnswers: true,
      }
    });
  }, [dragItems, dropZones, question.prompt]);


  const addDragItem = () => {
    const newItem: DragItem = {
      id: Date.now().toString(),
      label: "",
      type: "text",
    };
    setDragItems([...dragItems, newItem]);
  };

  const addDropZone = () => {
    const newZone: DropZone = {
      id: Date.now().toString(),
      label: "",
      correctItemId: "",
      x: 20,
      y: 20,
      width: 15,
      height: 10,
      shape: "rectangle",
    };
    setDropZones([...dropZones, newZone]);
  };

  const removeDragItem = (index: number) => {
    const updated = dragItems.filter((_, i) => i !== index);
    setDragItems(updated);
  };

  const removeDropZone = (index: number) => {
    const updated = dropZones.filter((_, i) => i !== index);
    setDropZones(updated);
  };

  const updateDragLabel = (index: number, value: string) => {
    const updated = [...dragItems];
    updated[index].label = value;
    setDragItems(updated);
  };

  const updateDropZoneLabel = (index: number, value: string) => {
    const updated = [...dropZones];
    updated[index].label = value;
    setDropZones(updated);
  };

  const updateDropZoneAnswer = (index: number, itemId: string) => {
    const updated = [...dropZones];
    updated[index].correctItemId = itemId;
    setDropZones(updated);
  };

  return (
    <div className="space-y-6">
      <p className="font-semibold text-gray-700">🧲 Drag & Drop Builder</p>

      {/* Drag Items */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Draggable Items</p>
        {dragItems.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder={`Item ${idx + 1}`}
              value={item.label}
              onChange={(e) => updateDragLabel(idx, e.target.value)}
              className="border px-3 py-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={() => removeDragItem(idx)}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded text-sm"
              title="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addDragItem}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          + Add Item
        </button>
      </div>

      {/* Drop Zones */}
      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Drop Zones</p>
        {dropZones.map((zone, idx) => (
          <div key={zone.id} className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder={`Drop Zone ${idx + 1}`}
                value={zone.label}
                onChange={(e) => updateDropZoneLabel(idx, e.target.value)}
                className="border px-3 py-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={() => removeDropZone(idx)}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-2 rounded text-sm"
                title="Remove drop zone"
              >
                ✕
              </button>
            </div>
            <select
              value={zone.correctItemId || ""}
              onChange={(e) => updateDropZoneAnswer(idx, e.target.value)}
              className="border px-3 py-2 rounded w-full bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select correct item</option>
              {dragItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label || `Item ${dragItems.indexOf(item) + 1}`}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button
          onClick={addDropZone}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          + Add Drop Zone
        </button>
      </div>
    </div>
  );
}
