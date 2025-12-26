'use client';

import { useState } from 'react';

interface Chapter {
  id: string;
  chapterNo: number;
  chapterName: string;
  topic?: string;
  description?: string;
}

interface BookChaptersManagerProps {
  bookId: string;
  bookTitle: string;
  subjectId: string;
  onClose: () => void;
  initialChapters?: Chapter[];
}

export default function BookChaptersManager({
  bookId,
  bookTitle,
  subjectId,
  onClose,
  initialChapters = [],
}: BookChaptersManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newChapter, setNewChapter] = useState({
    chapterNo: chapters.length + 1,
    chapterName: '',
    topic: '',
    description: '',
  });

  const handleAddChapter = async () => {
    if (!newChapter.chapterName) {
      setMessage('Please enter a chapter name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/books/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          subjectId,
          chapterNo: newChapter.chapterNo,
          chapterName: newChapter.chapterName,
          topic: newChapter.topic,
          description: newChapter.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chapter');
      }

      const data = await response.json();
      setChapters([...chapters, data.chapter]);
      setNewChapter({
        chapterNo: chapters.length + 2,
        chapterName: '',
        topic: '',
        description: '',
      });
      setMessage('✅ Chapter added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/books/chapters?bookId=${bookId}&subjectId=${subjectId}&chapterId=${chapterId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete chapter');
      }

      setChapters(chapters.filter(c => c.id !== chapterId));
      setMessage('✅ Chapter deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Manage Chapters - {bookTitle}</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-gray-900">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Message Alert */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.includes('✅')
                  ? 'bg-green-100 border border-green-300 text-green-800'
                  : 'bg-red-100 border border-red-300 text-red-800'
              }`}
            >
              {message}
            </div>
          )}

          {/* Add Chapter Form */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Add New Chapter</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newChapter.chapterNo}
                    onChange={(e) =>
                      setNewChapter({
                        ...newChapter,
                        chapterNo: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chapter Name *
                  </label>
                  <input
                    type="text"
                    value={newChapter.chapterName}
                    onChange={(e) =>
                      setNewChapter({ ...newChapter, chapterName: e.target.value })
                    }
                    placeholder="e.g., Introduction to Biology"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topic (Optional)
                </label>
                <input
                  type="text"
                  value={newChapter.topic}
                  onChange={(e) => setNewChapter({ ...newChapter, topic: e.target.value })}
                  placeholder="e.g., Cell Structure and Function"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newChapter.description}
                  onChange={(e) =>
                    setNewChapter({ ...newChapter, description: e.target.value })
                  }
                  placeholder="Enter chapter description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddChapter}
                disabled={isLoading || !newChapter.chapterName}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {isLoading ? 'Adding...' : '+ Add Chapter'}
              </button>
            </div>
          </div>

          {/* Chapters List */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Existing Chapters ({chapters.length})
            </h3>
            {chapters.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No chapters added yet</p>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-start hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-block bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                          Ch. {chapter.chapterNo}
                        </span>
                        <h4 className="font-semibold text-gray-900">{chapter.chapterName}</h4>
                      </div>
                      {chapter.topic && (
                        <p className="text-sm text-gray-600 mt-1">Topic: {chapter.topic}</p>
                      )}
                      {chapter.description && (
                        <p className="text-xs text-gray-500 mt-1">{chapter.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteChapter(chapter.id)}
                      disabled={isLoading}
                      className="ml-4 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg disabled:text-gray-400 font-medium text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-4 flex gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
