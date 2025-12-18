"use client";
import { useState, useCallback, useEffect } from "react";
import { FillBlanksQuestion, TextSegment } from "@/types/types";

interface FillBlanksPreviewProps {
  question: FillBlanksQuestion;
}

interface BlankState {
  blankId: string;
  filledItemId: string | null;
  isCorrect: boolean | null;
}

export default function FillBlanksPreview({ question }: FillBlanksPreviewProps) {
  const [blankStates, setBlankStates] = useState<BlankState[]>(
    (question.blanks || []).map(blank => ({
      blankId: blank.id,
      filledItemId: null,
      isCorrect: null
    }))
  );
  const [usedItems, setUsedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // Shuffle bank if configured (but keep consistent during the session)
  const [shuffledBank, setShuffledBank] = useState(() => {
    if (question.shuffleBank) {
      return [...question.bank].sort(() => Math.random() - 0.5);
    }
    return question.bank;
  });

  // Reset state when question changes (especially when bank items are added/removed)
  useEffect(() => {
    const blanks = question.blanks || [];
    const bank = question.bank || [];
    
    // Reset blank states to match current blanks
    setBlankStates(blanks.map(blank => ({
      blankId: blank.id,
      filledItemId: null,
      isCorrect: null
    })));
    
    // Reset used items
    setUsedItems(new Set());
    
    // Update shuffled bank
    if (question.shuffleBank) {
      setShuffledBank([...bank].sort(() => Math.random() - 0.5));
    } else {
      setShuffledBank(bank);
    }
    
    // Reset feedback states
    setShowFeedback(false);
    setShowCorrectAnswers(false);
  }, [question.bank?.length || 0, question.blanks?.length || 0, question.shuffleBank]);

  const availableItems = shuffledBank.filter(item => !usedItems.has(item.id));

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (blankId: string, itemId: string) => {
    // Find the blank and check correctness
    const blank = question.blanks.find(b => b.id === blankId);
    const isCorrect = blank ? blank.correctItemId === itemId : false;
    
    // Update blank states in one operation
    setBlankStates(prev => {
      const nextStates = prev.map(state => 
        state.filledItemId === itemId 
          ? { ...state, filledItemId: null, isCorrect: null } // Clear from any other blank
          : state.blankId === blankId 
          ? { ...state, filledItemId: itemId, isCorrect } // Add to target blank
          : state
      );
      
      // Update used items based on the new states
      const newlyUsed = nextStates.map(state => state.filledItemId).filter(Boolean) as string[];
      setUsedItems(new Set(newlyUsed));
      
      return nextStates;
    });

    // Show instant feedback if configured
    if (question.feedbackConfig.showInstant) {
      setShowFeedback(true);
    }
  };

  const removeItemFromBlank = (blankId: string) => {
    const state = blankStates.find(s => s.blankId === blankId);
    if (state?.filledItemId) {
      setBlankStates(prev => prev.map(s => 
        s.blankId === blankId ? { ...s, filledItemId: null, isCorrect: null } : s
      ));
      setUsedItems(prev => {
        const newUsed = new Set(prev);
        newUsed.delete(state.filledItemId!);
        return newUsed;
      });
    }
  };

  const handleSubmit = () => {
    // Calculate results
    const allFilled = blankStates.every(state => state.filledItemId !== null);
    if (!allFilled) {
      alert("Please fill in all blanks before submitting.");
      return;
    }

    // Update correctness for all blanks
    const updatedStates = blankStates.map(state => {
      const blank = question.blanks.find(b => b.id === state.blankId);
      const isCorrect = blank ? blank.correctItemId === state.filledItemId : false;
      return { ...state, isCorrect };
    });
    
    setBlankStates(updatedStates);
    setShowFeedback(true);
    
    // Show correct answers if configured
    if (question.feedbackConfig.showCorrectAnswers) {
      setShowCorrectAnswers(true);
    }
  };

  const handleReset = () => {
    setBlankStates(question.blanks.map(blank => ({
      blankId: blank.id,
      filledItemId: null,
      isCorrect: null
    })));
    setUsedItems(new Set());
    setShowFeedback(false);
    setShowCorrectAnswers(false);
  };

  const renderSegment = (segment: TextSegment, index: number) => {
    if (segment.type === "text") {
      return (
        <span key={segment.id} className="text-gray-800">
          {segment.text}
        </span>
      );
    } else if (segment.type === "blank") {
      const blankState = blankStates.find(state => state.blankId === segment.blankId);
      const filledItem = blankState?.filledItemId 
        ? question.bank.find(item => item.id === blankState.filledItemId)
        : null;
      const blank = question.blanks.find(b => b.id === segment.blankId);
      const correctItem = blank ? question.bank.find(item => item.id === blank.correctItemId) : null;

      return (
        <span key={segment.id} className="inline-block">
          <div
            className={`inline-flex items-center min-w-24 min-h-10 px-4 py-2 mx-2 border-2 rounded-xl cursor-pointer transition-all duration-200 font-medium shadow-sm ${
              draggedItem
                ? "border-blue-400 bg-blue-100 shadow-md transform scale-105"
                : filledItem
                ? blankState?.isCorrect === true
                  ? "border-green-400 bg-green-100 text-green-800 shadow-md"
                  : blankState?.isCorrect === false
                  ? "border-red-400 bg-red-100 text-red-800 shadow-md"
                  : "border-blue-300 bg-blue-50 text-blue-800 hover:shadow-md"
                : "border-dashed border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedItem) {
                handleDrop(segment.blankId!, draggedItem);
              }
            }}
            onClick={() => filledItem && removeItemFromBlank(segment.blankId!)}
            title={filledItem ? "Click to remove" : "Drag a word here"}
          >
            {filledItem ? (
              <span className="font-semibold">{filledItem.label}</span>
            ) : (
              <span className="text-gray-400 text-lg font-light">___</span>
            )}
          </div>
          
          {/* Show feedback for this blank */}
          {showFeedback && blankState && blankState.isCorrect !== null && (
            <div className={`inline-block ml-3 text-sm px-3 py-1 rounded-full font-medium shadow-sm ${
              blankState.isCorrect 
                ? "bg-green-500 text-white" 
                : "bg-red-500 text-white"
            }`}>
              {blankState.isCorrect ? "✓" : "✗"}
            </div>
          )}
          
          {/* Show correct answer if enabled */}
          {showCorrectAnswers && blankState && blankState.isCorrect === false && correctItem && (
            <div className="inline-block ml-3 text-sm px-3 py-1 rounded-full bg-blue-500 text-white font-medium shadow-sm">
              {correctItem.label}
            </div>
          )}
        </span>
      );
    }
    return null;
  };

  const correctCount = blankStates.filter(state => state.isCorrect === true).length;
  const totalBlanks = blankStates.length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Question Prompt */}
      {question.prompt && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fill in the Blanks</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            {question.prompt}
          </p>
        </div>
      )}

      {/* Sentence with Blanks */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-xl p-8 shadow-sm">
        <div className="text-xl leading-relaxed text-center max-w-3xl mx-auto">
          {(question.segments || []).map((segment, index) => renderSegment(segment, index))}
        </div>
      </div>

      {/* Word Bank */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Word Bank
              <span className="text-sm text-gray-500">({availableItems.length} available)</span>
            </h3>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {availableItems.map(item => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item.id)}
              onDragEnd={handleDragEnd}
              className={`relative px-4 py-3 bg-white border-2 border-blue-200 rounded-xl cursor-move font-medium text-gray-800 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 select-none ${
                draggedItem === item.id 
                  ? "opacity-50 scale-95 border-blue-400" 
                  : "hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400">⋮⋮</span>
                {item.label}
              </div>
            </div>
          ))}
          
          {availableItems.length === 0 && question.bank.length > 0 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                All words have been used!
              </div>
            </div>
          )}
          
          {(question.bank || []).length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">
                <div className="text-4xl mb-2">📝</div>
                <p>No words in the bank yet.</p>
                <p className="text-xs">Add words in the builder's "Bank" tab to see them here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={blankStates.some(state => state.filledItemId === null)}
          className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
            blankStates.some(state => state.filledItemId === null)
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
          }`}
        >
          {blankStates.some(state => state.filledItemId === null) ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin opacity-50"></span>
              Fill all blanks first
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              ✓ Check Answers
            </span>
          )}
        </button>
        
        <button
          onClick={handleReset}
          className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <span className="flex items-center justify-center gap-2">
            ↻ Reset All
          </span>
        </button>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`mx-auto max-w-2xl p-6 rounded-xl shadow-lg transform transition-all duration-300 ${
          correctCount === totalBlanks
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
            : "bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200"
        }`}>
          <div className="text-center">
            <div className={`text-6xl mb-4 ${
              correctCount === totalBlanks ? "text-green-500" : "text-yellow-500"
            }`}>
              {correctCount === totalBlanks ? "🎉" : "📝"}
            </div>
            
            <div className={`text-xl font-bold mb-2 ${
              correctCount === totalBlanks ? "text-green-800" : "text-yellow-800"
            }`}>
              {correctCount === totalBlanks
                ? question.feedbackConfig.correctMessage
                : question.feedbackConfig.incorrectMessage
              }
            </div>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              correctCount === totalBlanks 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                correctCount === totalBlanks ? "bg-green-500" : "bg-yellow-500"
              }`}></span>
              {correctCount} out of {totalBlanks} blanks correct
              {correctCount === totalBlanks && (
                <span className="ml-2">Perfect!</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}