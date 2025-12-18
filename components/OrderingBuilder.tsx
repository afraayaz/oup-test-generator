import { useState, useEffect } from "react";
import { OrderingQuestion, QuizItem } from "@/types/types";

type Props = {
  question: OrderingQuestion;
  onUpdate: (updated: OrderingQuestion) => void;
};

export default function OrderingBuilder({ question, onUpdate }: Props) {
  const [steps, setSteps] = useState<QuizItem[]>(question.steps || []);

  useEffect(() => {
    onUpdate({ 
      ...question, 
      steps 
    });
  }, [steps, question.prompt]);

  const handleAddStep = () => {
    const newStep: QuizItem = {
      id: Date.now().toString(),
      label: "",
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
  };

  const handleChange = (index: number, value: string) => {
    const updated = [...steps];
    updated[index].label = value;
    setSteps(updated);
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    const updated = [...steps];
    const [movedStep] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedStep);
    setSteps(updated);
  };

  return (
    <div className="space-y-4">
      <p className="font-semibold text-gray-700">🔢 Ordering Steps</p>
      <p className="text-sm text-gray-600">Students will arrange these steps in the correct chronological order</p>
      {steps.map((step, idx) => (
        <div key={step.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 font-medium min-w-[24px]">{idx + 1}.</span>
            <input
              type="text"
              placeholder={`Step ${idx + 1}`}
              value={step.label}
              onChange={(e) => handleChange(idx, e.target.value)}
              className="border px-3 py-2 rounded flex-1 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            <div className="flex gap-1">
              {idx > 0 && (
                <button
                  onClick={() => moveStep(idx, idx - 1)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-sm"
                  title="Move up"
                >
                  ↑
                </button>
              )}
              {idx < steps.length - 1 && (
                <button
                  onClick={() => moveStep(idx, idx + 1)}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-sm"
                  title="Move down"
                >
                  ↓
                </button>
              )}
              <button
                onClick={() => removeStep(idx)}
                className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                title="Remove step"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        onClick={handleAddStep}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow"
      >
        + Add Step
      </button>
    </div>
  );
}
