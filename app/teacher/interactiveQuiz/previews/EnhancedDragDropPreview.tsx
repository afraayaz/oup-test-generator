"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { DragDropQuestion, DragItem } from "@/types/types";

type Props = {
  question: DragDropQuestion;
};

type DraggedItem = {
  id: string;
  label: string;
  type: "text" | "image";
  imageUrl?: string;
};

type DropResult = {
  zoneId: string;
  itemId: string;
  isCorrect: boolean;
};

export default function EnhancedDragDropPreview({ question }: Props) {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [droppedItems, setDroppedItems] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, DropResult>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<DropResult | null>(null);
  const [completedZones, setCompletedZones] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [focusedZone, setFocusedZone] = useState<string | null>(null);
  const [keyboardMode, setKeyboardMode] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Handle drag start
  const handleDragStart = useCallback((item: DragItem) => {
    setDraggedItem({
      id: item.id,
      label: item.label,
      type: item.type,
      imageUrl: item.imageUrl,
    });
  }, []);

  // Handle keyboard selection
  const handleKeyboardSelect = useCallback((itemId: string) => {
    if (selectedItem === itemId) {
      setSelectedItem(null);
    } else {
      setSelectedItem(itemId);
      setKeyboardMode(true);
    }
  }, [selectedItem]);

  // Handle keyboard drop
  const handleKeyboardDrop = useCallback((zoneId: string) => {
    if (selectedItem) {
      const item = question.dragItems.find(i => i.id === selectedItem);
      if (item && !droppedItems[zoneId]) {
        setDraggedItem({
          id: item.id,
          label: item.label,
          type: item.type,
          imageUrl: item.imageUrl,
        });
        setTimeout(() => {
          handleDropLogic(zoneId);
          setSelectedItem(null);
          setFocusedZone(null);
        }, 0);
      }
    }
  }, [selectedItem, question.dragItems, droppedItems]);

  // Main drop logic
  const handleDropLogic = useCallback((zoneId: string) => {
    const currentDraggedItem = draggedItem || (selectedItem ? {
      id: selectedItem,
      label: question.dragItems.find(i => i.id === selectedItem)?.label || '',
      type: question.dragItems.find(i => i.id === selectedItem)?.type || 'text',
      imageUrl: question.dragItems.find(i => i.id === selectedItem)?.imageUrl,
    } : null);

    if (!currentDraggedItem) return;

    const zone = question.dropZones.find(z => z.id === zoneId);
    if (!zone) return;

    const isCorrect = zone.correctItemId === currentDraggedItem.id;
    
    setDroppedItems(prev => ({
      ...prev,
      [zoneId]: currentDraggedItem.id
    }));

    const result: DropResult = {
      zoneId,
      itemId: currentDraggedItem.id,
      isCorrect
    };

    setResults(prev => ({
      ...prev,
      [zoneId]: result
    }));

    setCompletedZones(prev => new Set([...prev, zoneId]));

    if (question.feedbackConfig.showInstant) {
      setLastResult(result);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }

    setDraggedItem(null);
  }, [draggedItem, selectedItem, question]);

  // Handle drop on zone
  const handleDrop = useCallback((zoneId: string) => {
    handleDropLogic(zoneId);
  }, [handleDropLogic]);

  // Handle removing item from zone
  const handleRemoveFromZone = useCallback((zoneId: string) => {
    setDroppedItems(prev => {
      const updated = { ...prev };
      delete updated[zoneId];
      return updated;
    });

    setResults(prev => {
      const updated = { ...prev };
      delete updated[zoneId];
      return updated;
    });

    setCompletedZones(prev => {
      const updated = new Set(prev);
      updated.delete(zoneId);
      return updated;
    });
  }, []);

  // Check if all zones are completed
  const allCompleted = question.dropZones?.every(zone => droppedItems[zone.id]) || false;
  const correctCount = Object.values(results).filter(r => r.isCorrect).length;
  const totalZones = question.dropZones?.length || 0;

  // Get available items (not yet placed)  
  const availableItems = (question.dragItems || []).filter(item => 
    !Object.values(droppedItems).includes(item.id)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Question Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {question.layoutMode === "image" ? "Diagram Labeling" : "Drag & Drop"}
        </h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto">
          {question.prompt}
        </p>
      </div>
      
      {/* Instructions */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm" role="region" aria-label="Instructions">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm">ℹ</span>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Instructions:</strong> Drag items from the available items below and drop them onto the correct zones{question.layoutMode === "image" ? " on the image" : " in the containers"}.{question.feedbackConfig.showInstant && " You'll see immediate feedback for each drop."}</p>
            <p><strong>Keyboard users:</strong> Press Tab to navigate, Enter/Space to select items and drop them in zones. Selected items are highlighted in blue.</p>
          </div>
        </div>
      </div>
      
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selectedItem && `${question.dragItems.find(i => i.id === selectedItem)?.label} selected for placement`}
        {focusedZone && !selectedItem && `Focused on ${question.dropZones.find(z => z.id === focusedZone)?.label} drop zone`}
      </div>

      {/* Layout-specific rendering */}
      {question.layoutMode === "image" && question.backgroundImage ? (
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          <div 
            ref={containerRef}
            className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-4"
            style={{ maxHeight: "600px" }}
          >
            <img
              ref={imageRef}
              src={question.backgroundImage}
              alt="Interactive diagram"
              className="w-full h-auto max-h-96 object-contain mx-auto rounded-lg shadow-sm"
              onDragOver={(e) => e.preventDefault()}
            />
            
            {/* Drop Zone Overlays */}
            {(question.dropZones || []).map((zone) => {
              const hasItem = droppedItems[zone.id];
              const result = results[zone.id];
              const item = hasItem ? question.dragItems.find(i => i.id === droppedItems[zone.id]) : null;
              
              return (
                <div
                  key={zone.id}
                  className={`absolute transition-all duration-200 cursor-pointer ${
                    (question.showDropZones ?? true)
                      ? `border-2 ${
                          hasItem 
                            ? result?.isCorrect 
                              ? "border-green-500 bg-green-100" 
                              : "border-red-500 bg-red-100"
                            : draggedItem
                              ? "border-blue-500 bg-blue-100 border-dashed"
                              : "border-gray-400 bg-gray-100 opacity-70"
                        }`
                      : hasItem
                        ? result?.isCorrect 
                          ? "border border-green-200 bg-green-50" 
                          : "border border-red-200 bg-red-50"
                        : "border-transparent hover:bg-gray-50 hover:bg-opacity-30"
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(zone.id);
                  }}
                  onClick={() => {
                    if (hasItem) {
                      handleRemoveFromZone(zone.id);
                    } else if (selectedItem) {
                      handleKeyboardDrop(zone.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectedItem && !hasItem) {
                        handleKeyboardDrop(zone.id);
                      } else if (hasItem) {
                        handleRemoveFromZone(zone.id);
                      }
                    }
                  }}
                  onFocus={() => setFocusedZone(zone.id)}
                  onBlur={() => setFocusedZone(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={hasItem ? `Remove ${item?.label} from ${zone.label}` : `Drop zone: ${zone.label}. ${selectedItem ? 'Press Enter to drop selected item' : 'Select an item first'}`}
                  title={hasItem ? "Click to remove item" : zone.label}
                  ref={(el) => { zoneRefs.current[zone.id] = el; }}
                >
                  {hasItem && item ? (
                    <div className="space-y-1">
                      {item.type === "image" && item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.label}
                          className="max-w-full max-h-8 object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-xs font-medium text-gray-700 leading-tight">
                          {item.label}
                        </div>
                      )}
                      {result && (
                        <div className={`text-xs ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {result.isCorrect ? '✓' : '✗'}
                        </div>
                      )}
                    </div>
                  ) : (question.showDropZones ?? true) ? (
                    <div className="text-xs text-gray-500 font-medium leading-tight">
                      {zone.label}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : question.layoutMode === "image" ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center text-gray-500">
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Background Image</h3>
          <p>Upload a background image in the builder to create an interactive diagram.</p>
        </div>
      ) : null}

      {/* Text Layout with Container Drop Zones */}
      {question.layoutMode === "text" && (
        <div className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Drop Zones
                <span className="text-sm text-gray-500">({question.dropZones.length} zones)</span>
              </h4>
            </div>
          </div>
          
          {question.dropZones.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(question.dropZones || [])
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((zone) => {
                  const hasItem = droppedItems[zone.id];
                  const result = results[zone.id];
                  const item = hasItem ? question.dragItems.find(i => i.id === droppedItems[zone.id]) : null;
                  
                  return (
                    <div
                      key={zone.id}
                      className={`bg-white rounded-2xl p-6 min-h-40 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${
                        (question.showDropZones ?? true)
                          ? `border-2 ${
                              hasItem 
                                ? result?.isCorrect 
                                  ? "border-green-400 bg-green-50 shadow-green-100" 
                                  : "border-red-400 bg-red-50 shadow-red-100"
                                : selectedItem
                                  ? "border-blue-400 bg-blue-50 border-dashed shadow-blue-100 scale-105"
                                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`
                          : hasItem
                            ? result?.isCorrect 
                              ? "border-2 border-green-200 bg-green-25 shadow-green-100" 
                              : "border-2 border-red-200 bg-red-25 shadow-red-100"
                            : "border-2 border-transparent hover:bg-gray-50 hover:border-gray-200"
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(zone.id);
                      }}
                      onClick={() => {
                        if (hasItem) {
                          handleRemoveFromZone(zone.id);
                        } else if (selectedItem) {
                          handleKeyboardDrop(zone.id);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (selectedItem && !hasItem) {
                            handleKeyboardDrop(zone.id);
                          } else if (hasItem) {
                            handleRemoveFromZone(zone.id);
                          }
                        }
                      }}
                      onFocus={() => setFocusedZone(zone.id)}
                      onBlur={() => setFocusedZone(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={hasItem ? `Remove ${item?.label} from ${zone.label}` : `Drop zone: ${zone.label}. ${selectedItem ? 'Press Enter to drop selected item' : 'Select an item first'}`}
                      title={hasItem ? "Click to remove item" : zone.label}
                      ref={(el) => { zoneRefs.current[zone.id] = el; }}
                    >
                      <div className="text-center space-y-3">
                        {(question.showDropZones ?? true) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <h5 className="font-bold text-gray-800 text-lg">{zone.label}</h5>
                            </div>
                            {zone.description && (
                              <p className="text-sm text-gray-600 leading-relaxed">{zone.description}</p>
                            )}
                          </div>
                        )}
                        
                        {hasItem && item ? (
                          <div className="space-y-3">
                            {item.type === "image" && item.imageUrl ? (
                              <div className="bg-gray-50 rounded-xl p-3 border">
                                <img 
                                  src={item.imageUrl} 
                                  alt={item.label}
                                  className="max-w-full max-h-20 object-contain mx-auto rounded-lg"
                                />
                              </div>
                            ) : (
                              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-sm">
                                <span className="font-semibold">
                                  {item.label}
                                </span>
                              </div>
                            )}
                            {result && (
                              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold ${
                                result.isCorrect 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-red-500 text-white'
                              }`}>
                                {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                            <div className="text-3xl mb-2">📦</div>
                            <p className="text-sm font-medium">
                              {selectedItem ? 'Click to drop selected item here' : 'Drop items here'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Drop Zones Yet</h3>
              <p className="text-gray-500">Create drop zones in the builder to see them here.</p>
            </div>
          )}
        </div>
      )}

      {/* Draggable Items */}
      <div className="space-y-6">
        <div className="flex items-center justify-center">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              Available Items
              <span className="text-sm text-gray-500">({availableItems.length} remaining)</span>
            </h4>
          </div>
        </div>
        
        {availableItems.length > 0 ? (
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
              {availableItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleKeyboardSelect(item.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-grabbed={selectedItem === item.id}
                  aria-label={`${item.label}. ${selectedItem === item.id ? 'Selected for keyboard placement. Press Enter to deselect.' : 'Press Enter to select for keyboard placement.'}`}
                  className={`relative bg-white border-2 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-move text-center focus:outline-none select-none ${
                    selectedItem === item.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-400 scale-105 shadow-blue-100' 
                      : 'border-orange-200 hover:border-orange-300 hover:scale-105 hover:shadow-md'
                  }`}
                  style={{ minHeight: "100px" }}
                  ref={(el) => { itemRefs.current[item.id] = el; }}
                >
                  {/* Drag indicator */}
                  <div className="absolute top-2 left-2 text-orange-400 text-sm">
                    ⋮⋮
                  </div>
                  
                  {item.type === "image" && item.imageUrl ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <img 
                          src={item.imageUrl} 
                          alt={item.label}
                          className="w-full max-h-12 object-contain mx-auto rounded"
                        />
                      </div>
                      <div className="text-xs font-medium text-gray-700">{item.label}</div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-sm font-semibold text-gray-800">
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              All items have been placed!
            </div>
          </div>
        )}
      </div>

      {/* Instant Feedback */}
      {showFeedback && lastResult && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          lastResult.isCorrect
            ? "bg-green-100 border-green-500 text-green-800"
            : "bg-red-100 border-red-500 text-red-800"
        }`} role="alert" aria-live="polite">
          {lastResult.isCorrect
            ? question.feedbackConfig.correctMessage
            : question.feedbackConfig.incorrectMessage
          }
        </div>
      )}

      {/* Progress and Results */}
      {totalZones > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-700">Progress</h4>
            <span className="text-sm text-gray-600">
              {Object.keys(droppedItems).length} / {totalZones} zones filled
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(Object.keys(droppedItems).length / totalZones) * 100}%` }}
            />
          </div>

          {allCompleted && (
            <div className="space-y-2">
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  correctCount === totalZones ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {correctCount === totalZones ? '🎉 Perfect Score!' : '📊 Results'}
                </div>
                <div className="text-sm text-gray-600">
                  {correctCount} out of {totalZones} correct
                  {correctCount < totalZones && " - Keep trying!"}
                </div>
              </div>
              
              {question.feedbackConfig.showCorrectAnswers && correctCount < totalZones && (
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="font-medium">Correct answers:</p>
                  {(question.dropZones || []).map(zone => {
                    const correctItem = (question.dragItems || []).find(item => item.id === zone.correctItemId);
                    return correctItem ? (
                      <div key={zone.id}>
                        • {zone.label}: {correctItem.label}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      {Object.keys(droppedItems).length > 0 && (
        <div className="text-center">
          <button
            onClick={() => {
              setDroppedItems({});
              setResults({});
              setCompletedZones(new Set());
              setShowFeedback(false);
              setSelectedItem(null);
              setFocusedZone(null);
              setLastResult(null);
            }}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            🔄 Reset Activity
          </button>
        </div>
      )}
    </div>
  );
}