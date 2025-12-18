"use client";
import { useState, useCallback } from "react";
import { CategorizationQuestion, Category, CategorizedItem, FeedbackConfig } from "@/types/types";

interface CategorizationBuilderProps {
  question: CategorizationQuestion;
  onUpdate: (updated: CategorizationQuestion) => void;
}

export default function CategorizationBuilder({ question, onUpdate }: CategorizationBuilderProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "items" | "feedback">("categories");

  const updateQuestion = useCallback((updates: Partial<CategorizationQuestion>) => {
    onUpdate({ ...question, ...updates });
  }, [question, onUpdate]);

  const addCategory = () => {
    const newCategory: Category = {
      id: Date.now().toString(),
      label: `Category ${question.categories.length + 1}`,
      description: ""
    };
    updateQuestion({
      categories: [...question.categories, newCategory]
    });
  };

  const updateCategory = (categoryId: string, updates: Partial<Category>) => {
    updateQuestion({
      categories: question.categories.map(category => 
        category.id === categoryId ? { ...category, ...updates } : category
      )
    });
  };

  const removeCategory = (categoryId: string) => {
    // Clear any items that were assigned to this category
    const updatedItems = question.items.map(item => 
      item.correctCategoryId === categoryId 
        ? { ...item, correctCategoryId: "" }
        : item
    );

    updateQuestion({
      categories: question.categories.filter(category => category.id !== categoryId),
      items: updatedItems
    });
  };

  const addItem = () => {
    const newItem: CategorizedItem = {
      id: Date.now().toString(),
      label: "",
      type: "text",
      correctCategoryId: ""
    };
    updateQuestion({
      items: [...question.items, newItem]
    });
  };

  const updateItem = (itemId: string, updates: Partial<CategorizedItem>) => {
    updateQuestion({
      items: question.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const removeItem = (itemId: string) => {
    updateQuestion({
      items: question.items.filter(item => item.id !== itemId)
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
          <span>📊</span>
          <span className="font-medium">Column Sorting Builder</span>
        </div>
        <p className="text-sm text-blue-700">Create categories and items that students will drag into the correct columns for sorting and classification.</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {["categories", "items", "feedback"].map((tab) => (
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

      {/* Tab Content */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Categories (Columns)</h3>
            <button
              onClick={addCategory}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Add Category
            </button>
          </div>

          {/* Categories Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-700 mb-3">Column Layout Preview</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {question.categories.map(category => (
                <div key={category.id} className="bg-white border-2 border-dashed border-gray-300 p-3 rounded-lg min-h-20">
                  <div className="font-medium text-gray-800 text-sm mb-1">{category.label || "Unnamed Category"}</div>
                  {category.description && (
                    <div className="text-xs text-gray-600">{category.description}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {question.items.filter(item => item.correctCategoryId === category.id).length} items
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category List */}
          <div className="space-y-3">
            {question.categories.map((category, index) => (
              <div key={category.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <input
                    type="text"
                    value={category.label}
                    onChange={(e) => updateCategory(category.id, { label: e.target.value })}
                    placeholder="Category name..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeCategory(category.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  value={category.description || ""}
                  onChange={(e) => updateCategory(category.id, { description: e.target.value })}
                  placeholder="Category description (optional)..."
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
            ))}

            {question.categories.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No categories yet. Add columns for students to sort items into.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "items" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Items to Categorize</h3>
            <button
              onClick={addItem}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Add Item
            </button>
          </div>

          {question.categories.length === 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">⚠️ Add categories first to assign items to them.</p>
            </div>
          )}

          {/* Items Summary */}
          {question.items.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Assignment Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {question.categories.map(category => {
                  const assignedItems = question.items.filter(item => item.correctCategoryId === category.id);
                  return (
                    <div key={category.id} className="bg-white p-3 rounded border">
                      <div className="font-medium text-gray-800">{category.label}</div>
                      <div className="text-gray-600">
                        {assignedItems.length} items: {assignedItems.map(item => item.label || "Unnamed").join(", ") || "None"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Item List */}
          <div className="space-y-3">
            {question.items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(item.id, { label: e.target.value })}
                    placeholder="Item text..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correct Category:
                    </label>
                    <select
                      value={item.correctCategoryId}
                      onChange={(e) => updateItem(item.id, { correctCategoryId: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category...</option>
                      {question.categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.label || "Unnamed category"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Type:
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={item.type === "text"}
                          onChange={() => updateItem(item.id, { type: "text", imageUrl: undefined })}
                          className="text-blue-500"
                        />
                        📝 Text
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={item.type === "image"}
                          onChange={() => updateItem(item.id, { type: "image" })}
                          className="text-blue-500"
                        />
                        🖼️ Image
                      </label>
                    </div>
                  </div>
                </div>

                {item.type === "image" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image URL:
                    </label>
                    <input
                      type="url"
                      value={item.imageUrl || ""}
                      onChange={(e) => updateItem(item.id, { imageUrl: e.target.value })}
                      placeholder="Enter image URL..."
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}

            {question.items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏷️</div>
                <p>No items yet. Add items that students will sort into categories.</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Settings</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={question.shuffleItems || false}
                onChange={(e) => updateQuestion({ shuffleItems: e.target.checked })}
                className="text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-yellow-700">Shuffle items for each student</span>
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
                  ? "Students see feedback immediately after dropping each item" 
                  : "Students see feedback only after submitting all items"
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
                placeholder="Enter message for correct categorization..."
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
                placeholder="Enter message for incorrect categorization..."
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