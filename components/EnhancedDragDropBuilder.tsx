"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DragDropQuestion, DragItem, DropZone, DropZoneShape, FeedbackConfig, LayoutMode } from "@/types/types";

type Props = {
  question: DragDropQuestion;
  onUpdate: (updated: DragDropQuestion) => void;
};

type DrawingMode = "rectangle" | "circle" | null;

export default function EnhancedDragDropBuilder({ question, onUpdate }: Props) {
  // Initialize state with proper defaults
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(question.layoutMode || "text");
  const [dragItems, setDragItems] = useState<DragItem[]>(question.dragItems || []);
  const [dropZones, setDropZones] = useState<DropZone[]>(question.dropZones || []);
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(question.backgroundImage);
  const [backgroundImageName, setBackgroundImageName] = useState<string | undefined>(question.backgroundImageName);
  const [feedbackConfig, setFeedbackConfig] = useState<FeedbackConfig>(
    question.feedbackConfig || {
      showInstant: false,
      correctMessage: "Correct! Well done!",
      incorrectMessage: "Not quite right. Try again!",
      showCorrectAnswers: true,
    }
  );
  
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "zones" | "feedback">("items");
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update parent component whenever state changes
  useEffect(() => {
    onUpdate({
      ...question,
      layoutMode,
      dragItems,
      dropZones,
      backgroundImage,
      backgroundImageName,
      feedbackConfig,
    });
  }, [layoutMode, dragItems, dropZones, backgroundImage, backgroundImageName, feedbackConfig, question.prompt]);

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBackgroundImage(result);
        setBackgroundImageName(file.name);
        // Clear existing drop zones when new image is uploaded
        setDropZones([]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Remove background image
  const removeBackgroundImage = useCallback(() => {
    setBackgroundImage(undefined);
    setBackgroundImageName(undefined);
    setDropZones([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Convert screen coordinates to image percentage coordinates
  const getImageCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!imageRef.current || !containerRef.current) return null;
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const x = ((clientX - imageRect.left) / imageRect.width) * 100;
    const y = ((clientY - imageRect.top) / imageRect.height) * 100;
    
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, []);

  // Handle mouse down on image for drawing drop zones
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!drawingMode || !backgroundImage || layoutMode !== "image") return;
    
    const coords = getImageCoordinates(event.clientX, event.clientY);
    if (!coords) return;
    
    setIsDrawing(true);
    
    const newZone: DropZone = {
      id: Date.now().toString(),
      label: `Zone ${dropZones.length + 1}`,
      correctItemId: "",
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      shape: drawingMode as DropZoneShape,
    };
    
    setDropZones([...dropZones, newZone]);
    setSelectedZone(newZone.id);
  }, [drawingMode, backgroundImage, dropZones, getImageCoordinates]);

  // Handle mouse move for resizing drop zones while drawing
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDrawing || !selectedZone || layoutMode !== "image") return;
    
    const coords = getImageCoordinates(event.clientX, event.clientY);
    if (!coords) return;
    
    setDropZones(prev => prev.map(zone => {
      if (zone.id === selectedZone && zone.x !== undefined && zone.y !== undefined) {
        const width = Math.abs(coords.x - zone.x);
        const height = Math.abs(coords.y - zone.y);
        return {
          ...zone,
          width: Math.min(width, 100 - zone.x),
          height: Math.min(height, 100 - zone.y),
        };
      }
      return zone;
    }));
  }, [isDrawing, selectedZone, getImageCoordinates]);

  // Handle mouse up to finish drawing
  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      setDrawingMode(null);
    }
  }, [isDrawing]);

  // Drag Items Management
  const addDragItem = useCallback(() => {
    const newItem: DragItem = {
      id: Date.now().toString(),
      label: "",
      type: "text",
    };
    setDragItems([...dragItems, newItem]);
  }, [dragItems]);

  const removeDragItem = useCallback((index: number) => {
    const itemId = dragItems[index].id;
    setDragItems(dragItems.filter((_, i) => i !== index));
    // Remove references to this item from drop zones
    setDropZones(zones => zones.map(zone => 
      zone.correctItemId === itemId ? { ...zone, correctItemId: "" } : zone
    ));
  }, [dragItems]);

  const updateDragItem = useCallback((index: number, updates: Partial<DragItem>) => {
    setDragItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  }, []);

  // Drop Zones Management
  const removeDropZone = useCallback((id: string) => {
    setDropZones(dropZones.filter(zone => zone.id !== id));
    if (selectedZone === id) {
      setSelectedZone(null);
    }
  }, [dropZones, selectedZone]);

  const updateDropZone = useCallback((id: string, updates: Partial<DropZone>) => {
    setDropZones(prev => prev.map(zone => 
      zone.id === id ? { ...zone, ...updates } : zone
    ));
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {["items", "zones", "feedback"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Layout Mode Selector */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-medium text-gray-800 mb-3">Layout Mode</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layoutMode"
              value="text"
              checked={layoutMode === "text"}
              onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
              className="text-blue-500 focus:ring-blue-500"
            />
            <span className="font-medium">Text Layout</span>
            <span className="text-sm text-gray-600">Create labeled drop zones without background image</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="layoutMode"
              value="image"
              checked={layoutMode === "image"}
              onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
              className="text-blue-500 focus:ring-blue-500"
            />
            <span className="font-medium">Image Layout</span>
            <span className="text-sm text-gray-600">Draw zones on uploaded background image</span>
          </label>
        </div>
      </div>

      {/* Background Image Upload (only for image mode) */}
      {layoutMode === "image" && (
        <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-3">Background Image</h3>
        
        {!backgroundImage ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="space-y-2">
              <div className="text-gray-400 text-4xl">+</div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
                >
                  Upload Image
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Upload a diagram, map, or any image to create interactive drop zones
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {backgroundImageName}
              </span>
              <button
                onClick={removeBackgroundImage}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            </div>
            
            {/* Image with Drop Zone Overlay */}
            <div 
              ref={containerRef}
              className="relative border rounded-lg overflow-hidden bg-white"
              style={{ maxHeight: "400px" }}
            >
              <img
                ref={imageRef}
                src={backgroundImage}
                alt="Background"
                className="w-full h-auto max-h-96 object-contain"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ cursor: drawingMode ? "crosshair" : "default" }}
              />
              
              {/* Drop Zone Overlays (only for image mode) */}
              {layoutMode === "image" && dropZones.filter(zone => 
                zone.x !== undefined && zone.y !== undefined && zone.width !== undefined && zone.height !== undefined
              ).map((zone) => (
                <div
                  key={zone.id}
                  className={`absolute border-2 ${
                    selectedZone === zone.id ? "border-blue-500 bg-blue-100" : "border-green-500 bg-green-100"
                  } opacity-70 cursor-pointer`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    borderRadius: zone.shape === "circle" ? "50%" : "0",
                  }}
                  onClick={() => setSelectedZone(zone.id)}
                  title={zone.label || `Zone ${dropZones.indexOf(zone) + 1}`}
                >
                  <div className="text-xs font-medium text-center p-1 text-gray-700">
                    {zone.label}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Drawing Controls */}
            <div className="flex gap-2">
              <button
                onClick={() => setDrawingMode("rectangle")}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  drawingMode === "rectangle"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                ⬜ Draw Rectangle
              </button>
              <button
                onClick={() => setDrawingMode("circle")}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  drawingMode === "circle"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                ⭕ Draw Circle
              </button>
              {drawingMode && (
                <button
                  onClick={() => setDrawingMode(null)}
                  className="px-3 py-2 rounded text-sm font-medium bg-red-500 hover:bg-red-600 text-white"
                >
                  ✕ Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}


      {/* Tab Content */}
      {activeTab === "items" && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">📦 Draggable Items</h3>
          
          {dragItems.map((item, idx) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="text"
                  placeholder={`Item ${idx + 1} label`}
                  value={item.label}
                  onChange={(e) => updateDragItem(idx, { label: e.target.value })}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeDragItem(idx)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                  title="Remove item"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={item.type === "text"}
                    onChange={() => updateDragItem(idx, { type: "text", imageUrl: undefined })}
                    className="text-blue-500"
                  />
                  📝 Text
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={item.type === "image"}
                    onChange={() => updateDragItem(idx, { type: "image" })}
                    className="text-blue-500"
                  />
                  🖼️ Image
                </label>
              </div>
              
              {item.type === "image" && (
                <div className="mt-3">
                  <input
                    type="url"
                    placeholder="Image URL"
                    value={item.imageUrl || ""}
                    onChange={(e) => updateDragItem(idx, { imageUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          ))}
          
          <button
            onClick={addDragItem}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
          >
            + Add Draggable Item
          </button>
        </div>
      )}

      {activeTab === "zones" && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Drop Zones</h3>
          
          {/* For Image Mode */}
          {layoutMode === "image" && (
            <>          
              {!backgroundImage ? (
                <div className="text-gray-500 text-center py-8">
                  <div className="text-2xl mb-2 text-gray-300">📷</div>
                  <p>Upload a background image first to create drop zones</p>
                </div>
              ) : dropZones.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  <div className="text-2xl mb-2 text-gray-300">⚬</div>
                  <p>Use the drawing tools above the image to create drop zones</p>
                </div>
              ) : null}
            </>
          )}
          
          {/* For Text Mode */}
          {layoutMode === "text" && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Create labeled containers for students to drag items into.
                </p>
                <button
                  onClick={() => {
                    const newZone: DropZone = {
                      id: Date.now().toString(),
                      label: `Zone ${dropZones.length + 1}`,
                      correctItemId: "",
                      order: dropZones.length,
                      description: "",
                    };
                    setDropZones([...dropZones, newZone]);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  + Add Text Zone
                </button>
              </div>
              
              {dropZones.length === 0 && (
                <div className="text-gray-500 text-center py-8">
                  <div className="text-2xl mb-2">📝</div>
                  <p>Add text zones using the button above</p>
                </div>
              )}
            </>
          )}
          
          {/* Zone List (for both modes) */}
          {dropZones.length > 0 && (
            dropZones.map((zone, idx) => (
              <div key={zone.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    placeholder={`Zone ${idx + 1} label`}
                    value={zone.label}
                    onChange={(e) => updateDropZone(zone.id, { label: e.target.value })}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={() => removeDropZone(zone.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded"
                    title="Remove zone"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Text mode: Description and Order */}
                {layoutMode === "text" && (
                  <div className="space-y-3 mb-3">
                    <input
                      type="text"
                      placeholder="Zone description (optional)"
                      value={zone.description || ""}
                      onChange={(e) => updateDropZone(zone.id, { description: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600">Display Order:</label>
                      <input
                        type="number"
                        min="0"
                        value={zone.order || 0}
                        onChange={(e) => updateDropZone(zone.id, { order: parseInt(e.target.value) || 0 })}
                        className="w-20 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                )}
                
                {/* Image mode: Position and size info */}
                <div className="flex items-center gap-4 mb-3">
                  {layoutMode === "image" && zone.shape && (
                    <span className="text-sm text-gray-600">
                      {zone.shape === "rectangle" ? "⬜" : "⭕"} {zone.shape}
                    </span>
                  )}
                  {layoutMode === "image" && zone.x !== undefined && zone.y !== undefined && (
                    <span className="text-sm text-gray-600">
                      Position: {zone.x.toFixed(1)}%, {zone.y.toFixed(1)}%
                    </span>
                  )}
                  {layoutMode === "image" && zone.width !== undefined && zone.height !== undefined && (
                    <span className="text-sm text-gray-600">
                      Size: {zone.width.toFixed(1)}% × {zone.height.toFixed(1)}%
                    </span>
                  )}
                  {layoutMode === "text" && (
                    <span className="text-sm text-gray-600">
                      📝 Text zone (Order: {zone.order || 0})
                    </span>
                  )}
                </div>
                
                <select
                  value={zone.correctItemId}
                  onChange={(e) => updateDropZone(zone.id, { correctItemId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select correct item for this zone</option>
                  {dragItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label || `Item ${dragItems.indexOf(item) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-700">Feedback Configuration</h3>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feedbackConfig.showInstant}
                onChange={(e) => setFeedbackConfig({
                  ...feedbackConfig,
                  showInstant: e.target.checked
                })}
                className="w-4 h-4 text-blue-500"
              />
              <span>Show instant feedback (on each drop)</span>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ✅ Correct Answer Message
              </label>
              <input
                type="text"
                value={feedbackConfig.correctMessage}
                onChange={(e) => setFeedbackConfig({
                  ...feedbackConfig,
                  correctMessage: e.target.value
                })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Message for correct answers"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ❌ Incorrect Answer Message
              </label>
              <input
                type="text"
                value={feedbackConfig.incorrectMessage}
                onChange={(e) => setFeedbackConfig({
                  ...feedbackConfig,
                  incorrectMessage: e.target.value
                })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Message for incorrect answers"
              />
            </div>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={feedbackConfig.showCorrectAnswers}
                onChange={(e) => setFeedbackConfig({
                  ...feedbackConfig,
                  showCorrectAnswers: e.target.checked
                })}
                className="w-4 h-4 text-blue-500"
              />
              <span>Show correct answers after completion</span>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={question.showDropZones ?? true}
                onChange={(e) => onUpdate({
                  ...question,
                  showDropZones: e.target.checked
                })}
                className="w-4 h-4 text-purple-500"
              />
              <span>Show drop zones to students</span>
              <div className="text-xs text-gray-500 ml-2">
                Uncheck for "mystery" questions like body parts
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}