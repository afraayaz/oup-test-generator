"use client";
import { useState } from "react";
import { MatchingQuestion, MatchPair } from "@/types/types";
import LineMatchingLayer from "./LineMatchingLayer";

type Props = {
  question: MatchingQuestion;
};

export default function MatchingPreview({ question }: Props) {
  const [matches, setMatches] = useState<Record<string, string>>({});

  // Transform pairs into left and right items for the LineMatchingLayer
  const leftItems = question.pairs.map((pair) => ({
    id: pair.id,
    label: pair.left
  }));

  const rightItems = question.pairs.map((pair) => ({
    id: pair.id,
    label: pair.right
  }));

  // Calculate progress metrics
  const totalPairs = question.pairs.length;
  const completedMatches = Object.keys(matches).length;
  const correctMatches = Object.entries(matches).filter(([leftId, rightId]) => leftId === rightId).length;
  const allCompleted = completedMatches === totalPairs;

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Question Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Textual Matching</h2>
        <p className="text-lg text-gray-700 leading-relaxed max-w-4xl mx-auto">
          {question.prompt}
        </p>
      </div>
      
      {/* Instructions */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-sm">⚡</span>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <p><strong>Instructions:</strong> Draw lines from left items to right items to create matches. Click and drag from any left item to connect it to a right item.</p>
            <p><strong>To remove:</strong> Click on a connected line or a connected left item to remove the connection. Each right item can only be used once.</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalPairs > 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-800">Progress</h4>
            <span className="text-sm text-gray-600">
              {completedMatches} / {totalPairs} matches made
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedMatches / totalPairs) * 100}%` }}
            />
          </div>
          
          {allCompleted && (
            <div className="mt-3 text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                correctMatches === totalPairs 
                  ? 'bg-green-500 text-white' 
                  : 'bg-orange-500 text-white'
              }`}>
                {correctMatches === totalPairs ? '🎉 Perfect Score!' : `📊 ${correctMatches}/${totalPairs} Correct`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Matching Interface */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
        <LineMatchingLayer
          leftItems={leftItems}
          rightItems={rightItems}
          matches={matches}
          onMatchChange={setMatches}
        />
      </div>

      {/* Current Matches Display */}
      {Object.keys(matches).length > 0 && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
            <h4 className="font-bold text-gray-800 text-lg">Your Matches</h4>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(matches).map(([leftPairId, rightPairId]) => {
              const leftPair = question.pairs.find((p) => p.id === leftPairId);
              const rightPair = question.pairs.find((p) => p.id === rightPairId);
              
              // Check if this is a correct match
              const isCorrect = leftPairId === rightPairId;
              
              return (
                <div 
                  key={leftPairId} 
                  className={`bg-white rounded-xl p-4 border-2 transition-all duration-200 ${
                    isCorrect 
                      ? 'border-green-400 bg-green-50 shadow-green-100' 
                      : 'border-red-400 bg-red-50 shadow-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-700 mb-1">{leftPair?.left}</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-0.5 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs text-gray-500">matches</span>
                        <div className={`w-4 h-0.5 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-1">{rightPair?.right}</div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCorrect 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {isCorrect ? '✓' : '✗'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset Button */}
      {Object.keys(matches).length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setMatches({})}
            className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            🔄 Reset All Matches
          </button>
        </div>
      )}
    </div>
  );
}
