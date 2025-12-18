"use client";
import { useState, useCallback, useEffect } from "react";
import { CategorizationQuestion, CategorizedItem } from "@/types/types";

interface CategorizationPreviewProps {
  question: CategorizationQuestion;
}

interface ItemPlacement {
  itemId: string;
  categoryId: string | null; // null means not placed yet
  isCorrect: boolean | null;
}

export default function CategorizationPreview({ question }: CategorizationPreviewProps) {
  const [itemPlacements, setItemPlacements] = useState<ItemPlacement[]>(
    (question.items || []).map(item => ({
      itemId: item.id,
      categoryId: null,
      isCorrect: null
    }))
  );
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);

  // Shuffle items if configured (but keep consistent during the session)
  const [shuffledItems, setShuffledItems] = useState(() => {
    if (question.shuffleItems) {
      return [...question.items].sort(() => Math.random() - 0.5);
    }
    return question.items;
  });

  // Reset state when question changes (especially when items are added/removed)
  useEffect(() => {
    const items = question.items || [];
    
    // Reset item placements to match current items
    setItemPlacements(items.map(item => ({
      itemId: item.id,
      categoryId: null,
      isCorrect: null
    })));
    
    // Update shuffled items
    if (question.shuffleItems) {
      setShuffledItems([...items].sort(() => Math.random() - 0.5));
    } else {
      setShuffledItems(items);
    }
    
    // Reset feedback states
    setShowFeedback(false);
    setShowCorrectAnswers(false);
  }, [question.items?.length || 0, question.shuffleItems]);

  const unplacedItems = shuffledItems.filter(item => 
    !itemPlacements.find(placement => placement.itemId === item.id && placement.categoryId !== null)
  );

  const getItemsInCategory = (categoryId: string) => {
    const placementsInCategory = itemPlacements.filter(placement => placement.categoryId === categoryId);
    return placementsInCategory.map(placement => 
      question.items.find(item => item.id === placement.itemId)!
    );
  };

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = (categoryId: string, itemId: string) => {
    const item = question.items.find(i => i.id === itemId);
    const isCorrect = item ? item.correctCategoryId === categoryId : false;
    
    // Update placements in one operation
    setItemPlacements(prev => {
      const nextPlacements = prev.map(placement => 
        placement.itemId === itemId 
          ? { ...placement, categoryId, isCorrect }
          : placement
      );
      
      return nextPlacements;
    });

    // Show instant feedback if configured
    if (question.feedbackConfig.showInstant) {
      setShowFeedback(true);
    }
  };

  const removeItemFromCategory = (itemId: string) => {
    setItemPlacements(prev => prev.map(placement => 
      placement.itemId === itemId 
        ? { ...placement, categoryId: null, isCorrect: null }
        : placement
    ));
  };

  const handleSubmit = () => {
    // Check if all items are placed
    const allPlaced = itemPlacements.every(placement => placement.categoryId !== null);
    if (!allPlaced) {
      alert("Please place all items in categories before submitting.");
      return;
    }

    // Update correctness for all items
    const updatedPlacements = itemPlacements.map(placement => {
      const item = question.items.find(i => i.id === placement.itemId);
      const isCorrect = item && placement.categoryId 
        ? item.correctCategoryId === placement.categoryId 
        : false;
      return { ...placement, isCorrect };
    });
    
    setItemPlacements(updatedPlacements);
    setShowFeedback(true);
    
    // Show correct answers if configured
    if (question.feedbackConfig.showCorrectAnswers) {
      setShowCorrectAnswers(true);
    }
  };

  const handleReset = () => {
    setItemPlacements(question.items.map(item => ({
      itemId: item.id,
      categoryId: null,
      isCorrect: null
    })));
    setShowFeedback(false);
    setShowCorrectAnswers(false);
  };

  const renderItem = (item: CategorizedItem, showFeedbackIcon = false) => {
    const placement = itemPlacements.find(p => p.itemId === item.id);
    const correctCategory = question.categories.find(cat => cat.id === item.correctCategoryId);
    
    return (
      <div
        key={item.id}
        draggable
        onDragStart={() => handleDragStart(item.id)}
        onDragEnd={handleDragEnd}
        onClick={() => placement?.categoryId && removeItemFromCategory(item.id)}
        className={`relative p-3 bg-white border-2 rounded-lg cursor-move hover:shadow transition-all duration-200 flex items-center justify-center select-none text-sm ${
          showFeedbackIcon ? 'w-full' : 'w-auto max-w-32'
        } overflow-hidden ${
          draggedItem === item.id 
            ? "opacity-50 scale-95 border-blue-400 shadow-md" 
            : "hover:scale-105"
        } ${
          placement?.categoryId && !showFeedbackIcon ? "cursor-pointer hover:border-red-300" : "hover:border-blue-300"
        } ${
          showFeedback && placement?.isCorrect === true
            ? "border-green-400 bg-green-50 shadow-md"
            : showFeedback && placement?.isCorrect === false
            ? "border-red-400 bg-red-50 shadow-md"
            : "border-gray-200 hover:bg-gray-50"
        }`}
        title={placement?.categoryId && !showFeedbackIcon ? "Click to remove from category" : "Drag to category"}
      >
        <div className="flex flex-col items-center justify-center gap-1 w-full">
          {item.type === "image" && item.imageUrl ? (
            <img 
              src={item.imageUrl} 
              alt={item.label}
              className="w-6 h-6 object-cover rounded border border-gray-200"
            />
          ) : null}
          
          <span className="block w-full font-medium text-gray-800 text-center text-xs leading-tight truncate px-1">{item.label}</span>
          
          {/* Feedback icons positioned absolutely */}
          {showFeedbackIcon && showFeedback && placement && placement.isCorrect !== null && (
            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold pointer-events-none ${
              placement.isCorrect ? "bg-green-500" : "bg-red-500"
            }`}>
              {placement.isCorrect ? "✓" : "✗"}
            </div>
          )}
          
          {/* Show correct answer if enabled */}
          {showFeedbackIcon && showCorrectAnswers && placement && placement.isCorrect === false && correctCategory && (
            <div className="absolute bottom-1 left-1 text-xs px-1 py-0.5 rounded bg-blue-500 text-white font-medium truncate max-w-16 pointer-events-none">
              → {correctCategory.label}
            </div>
          )}
        </div>
      </div>
    );
  };

  const correctCount = itemPlacements.filter(placement => placement.isCorrect === true).length;
  const totalItems = itemPlacements.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Question Prompt */}
      {question.prompt && (
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Column Sorting</h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
            {question.prompt}
          </p>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(question.categories || []).map(category => {
          const itemsInCategory = getItemsInCategory(category.id);
          return (
            <div
              key={category.id}
              className={`relative bg-white border-2 border-dashed border-gray-400 p-4 min-w-0 transition-all duration-300 flex flex-col min-h-32 ${
                draggedItem
                  ? "border-blue-500 shadow-lg scale-105"
                  : "hover:border-gray-500"
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedItem) {
                  handleDrop(category.id, draggedItem);
                }
              }}
            >
              {/* Horizontal Header */}
              <div className="mb-3 pb-2 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 text-sm text-center">{category.label}</h3>
              </div>
              
              {/* Items Container */}
              <div className="space-y-2">
                {itemsInCategory.map(item => renderItem(item, true))}
                {itemsInCategory.length === 0 && (
                  <div className="flex items-center justify-center py-4 text-gray-500 border border-dashed border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <p className="text-sm font-medium">Drop items here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unplaced Items */}
      {unplacedItems.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            <h3 className="font-semibold text-gray-800">
              Items to Categorize
            </h3>
            <span className="text-sm text-gray-500 bg-white px-2 py-1 rounded-full">
              {unplacedItems.length} remaining
            </span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {unplacedItems.map(item => renderItem(item))}
          </div>
        </div>
      )}

      {/* Empty state when no items exist */}
      {(question.items || []).length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Items Yet</h3>
          <p className="text-gray-500">Add items in the builder to see them here for categorization.</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={handleSubmit}
          disabled={itemPlacements.some(placement => placement.categoryId === null)}
          className={`w-full sm:w-auto px-8 py-3 rounded-xl font-semibold transition-all duration-200 ${
            itemPlacements.some(placement => placement.categoryId === null)
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
          }`}
        >
          {itemPlacements.some(placement => placement.categoryId === null) ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin opacity-50"></span>
              Categorize all items first
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              ✓ Check Categories
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
          correctCount === totalItems
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200"
            : "bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200"
        }`}>
          <div className="text-center">
            <div className={`text-6xl mb-4 ${
              correctCount === totalItems ? "text-green-500" : "text-yellow-500"
            }`}>
              {correctCount === totalItems ? "🎉" : "📊"}
            </div>
            
            <div className={`text-xl font-bold mb-2 ${
              correctCount === totalItems ? "text-green-800" : "text-yellow-800"
            }`}>
              {correctCount === totalItems
                ? question.feedbackConfig.correctMessage
                : question.feedbackConfig.incorrectMessage
              }
            </div>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              correctCount === totalItems 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                correctCount === totalItems ? "bg-green-500" : "bg-yellow-500"
              }`}></span>
              {correctCount} out of {totalItems} items correctly categorized
              {correctCount === totalItems && (
                <span className="ml-2">Perfect!</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}