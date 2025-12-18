import { useState, useEffect } from "react";
import { MatchingQuestion, MatchPair } from "@/types/types";

type Props = {
  question: MatchingQuestion;
  onUpdate: (updated: MatchingQuestion) => void;
};

export default function MatchingBuilder({ question, onUpdate }: Props) {
  const [pairs, setPairs] = useState<MatchPair[]>(question.pairs || []);

  useEffect(() => {
    onUpdate({ 
      ...question, 
      pairs 
    });
  }, [pairs, question.prompt]);

  const handleAddPair = () => {
    const newPair: MatchPair = {
      id: Date.now().toString(),
      left: "",
      right: "",
    };
    setPairs([...pairs, newPair]);
  };

  const removePair = (index: number) => {
    const updated = pairs.filter((_, i) => i !== index);
    setPairs(updated);
  };

  const handleChange = (index: number, field: 'left' | 'right', value: string) => {
    const updated = [...pairs];
    updated[index][field] = value;
    setPairs(updated);
  };

  return (
    <div className="space-y-4">
      <p className="font-semibold text-gray-700">🔗 Matching Pairs</p>
      {pairs.map((pair, idx) => (
        <div key={pair.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <input
              type="text"
              placeholder="Left Item"
              value={pair.left}
              onChange={(e) => handleChange(idx, "left", e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="text"
              placeholder="Right Item"
              value={pair.right}
              onChange={(e) => handleChange(idx, "right", e.target.value)}
              className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => removePair(idx)}
              className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
              title="Remove pair"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={handleAddPair}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
      >
        + Add Pair
      </button>
    </div>
  );
}