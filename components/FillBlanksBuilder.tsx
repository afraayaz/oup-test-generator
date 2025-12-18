"use client";
import { useState, useCallback } from "react";
import { FillBlanksQuestion, TextSegment, BlankItem, DragItem, FeedbackConfig } from "@/types/types";

interface FillBlanksBuilderProps {
  question: FillBlanksQuestion;
  onUpdate: (updated: FillBlanksQuestion) => void;
}

export default function FillBlanksBuilder({ question, onUpdate }: FillBlanksBuilderProps) {
  const [activeTab, setActiveTab] = useState<"segments" | "bank" | "feedback">("segments");

  const updateQuestion = useCallback((updates: Partial<FillBlanksQuestion>) => {
    onUpdate({ ...question, ...updates });
  }, [question, onUpdate]);

  const addTextSegment = () => {
    const newSegment: TextSegment = {
      id: Date.now().toString(),
      type: "text",
      text: "Add your text here"
    };
    updateQuestion({
      segments: [...question.segments, newSegment]
    });
  };

  const addBlankSegment = () => {
    const blankId = `blank_${Date.now()}`;
    const newSegment: TextSegment = {
      id: Date.now().toString(),
      type: "blank",
      blankId: blankId
    };
    
    const newBlank: BlankItem = {
      id: blankId,
      correctItemId: ""
    };

    updateQuestion({
      segments: [...question.segments, newSegment],
      blanks: [...question.blanks, newBlank]
    });
  };

  const updateSegment = (segmentId: string, updates: Partial<TextSegment>) => {
    updateQuestion({
      segments: question.segments.map(segment => 
        segment.id === segmentId ? { ...segment, ...updates } : segment
      )
    });
  };

  const removeSegment = (segmentId: string) => {
    const segment = question.segments.find(s => s.id === segmentId);
    let updatedBlanks = question.blanks;
    
    // If removing a blank segment, also remove its associated blank
    if (segment?.type === "blank" && segment.blankId) {
      updatedBlanks = question.blanks.filter(blank => blank.id !== segment.blankId);
    }

    updateQuestion({
      segments: question.segments.filter(segment => segment.id !== segmentId),
      blanks: updatedBlanks
    });
  };

  const addBankItem = () => {
    const newItem: DragItem = {
      id: Date.now().toString(),
      label: "",
      type: "text"
    };
    updateQuestion({
      bank: [...question.bank, newItem]
    });
  };

  const updateBankItem = (itemId: string, updates: Partial<DragItem>) => {
    updateQuestion({
      bank: question.bank.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const removeBankItem = (itemId: string) => {
    // Also clear any blank associations with this item
    const updatedBlanks = question.blanks.map(blank => 
      blank.correctItemId === itemId ? { ...blank, correctItemId: "" } : blank
    );
    
    updateQuestion({
      bank: question.bank.filter(item => item.id !== itemId),
      blanks: updatedBlanks
    });
  };

  const updateBlankCorrectAnswer = (blankId: string, correctItemId: string) => {
    updateQuestion({
      blanks: question.blanks.map(blank => 
        blank.id === blankId ? { ...blank, correctItemId } : blank
      )
    });
  };

  const updateFeedbackConfig = (updates: Partial<FeedbackConfig>) => {
    updateQuestion({
      feedbackConfig: { ...question.feedbackConfig, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Panel */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-800 mb-2">
          <span>📝</span>
          <span className="font-medium">Fill-in-the-Blanks Builder</span>
        </div>
        <p className="text-sm text-blue-700">Create sentences with blank spaces and provide a bank of words for students to drag into the blanks.</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {["segments", "bank", "feedback"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab === "segments" ? "Text & Blanks" : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "segments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Sentence Structure</h3>
            <div className="flex gap-2">
              <button
                onClick={addTextSegment}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm"
              >
                + Add Text
              </button>
              <button
                onClick={addBlankSegment}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm"
              >
                + Add Blank
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Preview</h4>
            <div className="bg-white p-4 rounded border min-h-12 flex flex-wrap items-center gap-1">
              {question.segments.map((segment, index) => {
                if (segment.type === "text") {
                  return (
                    <span key={segment.id} className="text-gray-800">
                      {segment.text}
                    </span>
                  );
                } else {
                  const blank = question.blanks.find(b => b.id === segment.blankId);
                  const correctItem = question.bank.find(item => item.id === blank?.correctItemId);
                  return (
                    <span 
                      key={segment.id} 
                      className="inline-block bg-gray-200 border border-dashed border-gray-400 px-3 py-1 rounded min-w-16 text-center text-sm"
                      title={correctItem ? `Correct answer: ${correctItem.label}` : "No correct answer set"}
                    >
                      {correctItem ? `[${correctItem.label}]` : "[___]"}
                    </span>
                  );
                }
              })}
            </div>
          </div>

          <div className="space-y-3">
            {question.segments.map((segment, index) => (
              <div key={segment.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    segment.type === "text" 
                      ? "bg-blue-100 text-blue-700" 
                      : "bg-green-100 text-green-700"
                  }`}>
                    {segment.type === "text" ? "Text" : "Blank"}
                  </span>
                  <button
                    onClick={() => removeSegment(segment.id)}
                    className="ml-auto text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                {segment.type === "text" ? (
                  <textarea
                    value={segment.text || ""}
                    onChange={(e) => updateSegment(segment.id, { text: e.target.value })}
                    placeholder="Enter text content..."
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Answer for this Blank:
                    </label>
                    <select
                      value={question.blanks.find(b => b.id === segment.blankId)?.correctItemId || ""}
                      onChange={(e) => updateBlankCorrectAnswer(segment.blankId!, e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select correct word...</option>
                      {question.bank.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.label || "Unnamed item"}
                        </option>
                      ))}
                    </select>
                    {question.bank.length === 0 && (
                      <p className="text-sm text-gray-500 mt-1">Add words to the bank first to set correct answers</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {question.segments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📝</div>
                <p>No segments yet. Add text and blanks to build your sentence.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "bank" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Word Bank</h3>
            <button
              onClick={addBankItem}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Add Word
            </button>
          </div>

          <div className="space-y-3">
            {question.bank.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateBankItem(item.id, { label: e.target.value })}
                    placeholder="Enter word or phrase..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeBankItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {question.bank.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💭</div>
                <p>No words in the bank yet. Add words that students can drag into blanks.</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Settings</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={question.shuffleBank || false}
                onChange={(e) => updateQuestion({ shuffleBank: e.target.checked })}
                className="text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-yellow-700">Shuffle word bank for each student</span>
            </label>
          </div>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Feedback Configuration</h3>
          
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={question.feedbackConfig.showInstant}
                  onChange={(e) => updateFeedbackConfig({ showInstant: e.target.checked })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">Show instant feedback</span>
              </label>
              <p className="text-sm text-gray-600 ml-6">
                {question.feedbackConfig.showInstant 
                  ? "Students see feedback immediately after dropping each word" 
                  : "Students see feedback only after completing all blanks"
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer Message
              </label>
              <input
                type="text"
                value={question.feedbackConfig.correctMessage}
                onChange={(e) => updateFeedbackConfig({ correctMessage: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter message for correct answers..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Incorrect Answer Message
              </label>
              <input
                type="text"
                value={question.feedbackConfig.incorrectMessage}
                onChange={(e) => updateFeedbackConfig({ incorrectMessage: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter message for incorrect answers..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={question.feedbackConfig.showCorrectAnswers}
                  onChange={(e) => updateFeedbackConfig({ showCorrectAnswers: e.target.checked })}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-700">Show correct answers after completion</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}