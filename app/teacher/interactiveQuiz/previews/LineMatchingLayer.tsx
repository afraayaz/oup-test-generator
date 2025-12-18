"use client";
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";

type Point = {
  x: number;
  y: number;
};

type Anchors = {
  left: Record<string, Point>;
  right: Record<string, Point>;
};

type TempConnection = {
  sourceLeftId: string;
  cursor: Point;
} | null;

type Props = {
  leftItems: Array<{ id: string; label: string }>;
  rightItems: Array<{ id: string; label: string }>;
  matches: Record<string, string>;
  onMatchChange: (matches: Record<string, string>) => void;
};

export default function LineMatchingLayer({ leftItems, rightItems, matches, onMatchChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<string, HTMLElement>>({});
  const rightRefs = useRef<Record<string, HTMLElement>>({});
  
  const [anchors, setAnchors] = useState<Anchors>({ left: {}, right: {} });
  const [tempConnection, setTempConnection] = useState<TempConnection>(null);
  const [rightUsed, setRightUsed] = useState<Set<string>>(new Set());

  // Update used right items when matches change
  useEffect(() => {
    setRightUsed(new Set(Object.values(matches)));
  }, [matches]);

  // Measure anchors for all items
  const measureAnchors = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newAnchors: Anchors = { left: {}, right: {} };

    // Measure left items
    leftItems.forEach(item => {
      const element = leftRefs.current[item.id];
      if (element) {
        const rect = element.getBoundingClientRect();
        newAnchors.left[item.id] = {
          x: rect.right - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      }
    });

    // Measure right items
    rightItems.forEach(item => {
      const element = rightRefs.current[item.id];
      if (element) {
        const rect = element.getBoundingClientRect();
        newAnchors.right[item.id] = {
          x: rect.left - containerRect.left,
          y: rect.top + rect.height / 2 - containerRect.top
        };
      }
    });

    setAnchors(newAnchors);
  }, [leftItems, rightItems]);

  // Measure anchors on mount and when items change
  useLayoutEffect(() => {
    measureAnchors();
  }, [measureAnchors]);

  // Set up ResizeObserver for responsive anchor updates
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      measureAnchors();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [measureAnchors]);

  // Handle pointer events for drawing
  const handlePointerDown = (event: React.PointerEvent, leftId: string) => {
    event.preventDefault();
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    setTempConnection({
      sourceLeftId: leftId,
      cursor: {
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top
      }
    });

    // Don't capture pointer - let events bubble to container and right items
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!tempConnection || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    setTempConnection({
      ...tempConnection,
      cursor: {
        x: event.clientX - containerRect.left,
        y: event.clientY - containerRect.top
      }
    });
  };

  const handlePointerUp = (event: React.PointerEvent, rightId?: string) => {
    if (!tempConnection) return;

    if (rightId && !rightUsed.has(rightId)) {
      // Create connection
      const newMatches = { ...matches };
      // Remove any existing connection from this left item
      delete newMatches[tempConnection.sourceLeftId];
      // Add new connection
      newMatches[tempConnection.sourceLeftId] = rightId;
      onMatchChange(newMatches);
    }

    setTempConnection(null);
  };

  const handlePointerCancel = () => {
    setTempConnection(null);
  };

  // Handle line deletion
  const handleLineClick = (leftId: string) => {
    const newMatches = { ...matches };
    delete newMatches[leftId];
    onMatchChange(newMatches);
  };

  const handleLeftItemClick = (leftId: string) => {
    if (matches[leftId]) {
      // Remove existing connection
      handleLineClick(leftId);
    }
  };

  // Generate SVG path for line
  const generatePath = (start: Point, end: Point) => {
    const controlOffset = Math.abs(end.x - start.x) * 0.5;
    return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => handlePointerUp(e)}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }}
    >
      {/* Enhanced Matching Interface */}
      <div className="grid grid-cols-2 gap-8 p-6">
        {/* Left Items */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <h4 className="font-bold text-gray-800 text-lg">Terms</h4>
            <span className="text-sm text-gray-500">({leftItems.length} items)</span>
          </div>
          
          <div className="space-y-3">
            {leftItems.map((item) => (
              <button
                key={`left-${item.id}`}
                ref={(el) => {
                  if (el) leftRefs.current[item.id] = el;
                }}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                onClick={() => handleLeftItemClick(item.id)}
                className={`group w-full px-5 py-4 rounded-xl border-2 transition-all duration-200 font-semibold text-left shadow-sm hover:shadow-md relative ${
                  matches[item.id]
                    ? "bg-green-50 border-green-400 text-green-800 shadow-green-100"
                    : tempConnection?.sourceLeftId === item.id
                    ? "bg-purple-50 border-purple-400 text-purple-800 shadow-purple-100 scale-105"
                    : "bg-white border-gray-300 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                }`}
                style={{ touchAction: 'none' }}
              >
                {/* Drag indicator for active connection */}
                {tempConnection?.sourceLeftId === item.id && (
                  <div className="absolute top-2 right-2 text-purple-500">
                    <span className="text-sm">⚡</span>
                  </div>
                )}
                
                {item.label}
                
                {matches[item.id] && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Items */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
            <h4 className="font-bold text-gray-800 text-lg">Definitions</h4>
            <span className="text-sm text-gray-500">({rightItems.length} items)</span>
          </div>
          
          <div className="space-y-3">
            {rightItems.map((item) => (
              <button
                key={`right-${item.id}`}
                ref={(el) => {
                  if (el) rightRefs.current[item.id] = el;
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  handlePointerUp(e, item.id);
                }}
                className={`group w-full px-5 py-4 rounded-xl border-2 transition-all duration-200 font-semibold text-left shadow-sm relative ${
                  rightUsed.has(item.id)
                    ? "bg-green-50 border-green-400 text-green-800 shadow-green-100 cursor-not-allowed"
                    : tempConnection && !rightUsed.has(item.id)
                    ? "bg-indigo-50 border-indigo-300 text-indigo-800 hover:bg-indigo-100 shadow-indigo-100 hover:shadow-md"
                    : "bg-white border-gray-300 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
                }`}
                disabled={rightUsed.has(item.id)}
                style={{ touchAction: 'none' }}
              >
                {/* Target indicator for drop zones */}
                {tempConnection && !rightUsed.has(item.id) && (
                  <div className="absolute top-2 right-2 text-indigo-500">
                    <span className="text-sm">🎯</span>
                  </div>
                )}
                
                {item.label}
                
                {rightUsed.has(item.id) && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Overlay for Lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      >
        {/* Committed connections */}
        {Object.entries(matches).map(([leftId, rightId]) => {
          const leftAnchor = anchors.left[leftId];
          const rightAnchor = anchors.right[rightId];
          
          if (!leftAnchor || !rightAnchor) return null;

          return (
            <g key={`${leftId}-${rightId}`}>
              {/* Glow effect */}
              <path
                d={generatePath(leftAnchor, rightAnchor)}
                stroke="#10b981"
                strokeWidth="6"
                fill="none"
                opacity="0.3"
                className="pointer-events-none"
              />
              {/* Main connection line */}
              <path
                d={generatePath(leftAnchor, rightAnchor)}
                stroke="#10b981"
                strokeWidth="3"
                fill="none"
                className="pointer-events-auto cursor-pointer hover:stroke-red-500 transition-colors duration-200"
                onClick={() => handleLineClick(leftId)}
                strokeDasharray="none"
              />
              {/* Invisible thicker path for easier clicking */}
              <path
                d={generatePath(leftAnchor, rightAnchor)}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                className="pointer-events-auto cursor-pointer"
                onClick={() => handleLineClick(leftId)}
              />
              {/* Enhanced end dots with glow */}
              <circle
                cx={leftAnchor.x}
                cy={leftAnchor.y}
                r="6"
                fill="#10b981"
                opacity="0.3"
              />
              <circle
                cx={leftAnchor.x}
                cy={leftAnchor.y}
                r="4"
                fill="#10b981"
              />
              <circle
                cx={rightAnchor.x}
                cy={rightAnchor.y}
                r="6"
                fill="#10b981"
                opacity="0.3"
              />
              <circle
                cx={rightAnchor.x}
                cy={rightAnchor.y}
                r="4"
                fill="#10b981"
              />
            </g>
          );
        })}

        {/* Temporary line while drawing */}
        {tempConnection && anchors.left[tempConnection.sourceLeftId] && (
          <g>
            {/* Animated glow effect for temporary line */}
            <path
              d={generatePath(anchors.left[tempConnection.sourceLeftId], tempConnection.cursor)}
              stroke="#8b5cf6"
              strokeWidth="5"
              fill="none"
              opacity="0.4"
              strokeDasharray="8,4"
            />
            {/* Main temporary line */}
            <path
              d={generatePath(anchors.left[tempConnection.sourceLeftId], tempConnection.cursor)}
              stroke="#8b5cf6"
              strokeWidth="3"
              fill="none"
              strokeDasharray="8,4"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
            {/* Pulsating start dot */}
            <circle
              cx={anchors.left[tempConnection.sourceLeftId].x}
              cy={anchors.left[tempConnection.sourceLeftId].y}
              r="6"
              fill="#8b5cf6"
              opacity="0.3"
            >
              <animate
                attributeName="r"
                values="6;8;6"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              cx={anchors.left[tempConnection.sourceLeftId].x}
              cy={anchors.left[tempConnection.sourceLeftId].y}
              r="4"
              fill="#8b5cf6"
            />
            {/* Cursor indicator */}
            <circle
              cx={tempConnection.cursor.x}
              cy={tempConnection.cursor.y}
              r="3"
              fill="#8b5cf6"
              opacity="0.8"
            >
              <animate
                attributeName="opacity"
                values="0.8;0.3;0.8"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}