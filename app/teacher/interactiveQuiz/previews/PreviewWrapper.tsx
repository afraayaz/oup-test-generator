import EnhancedDragDropPreview from "./EnhancedDragDropPreview";
import MatchingPreview from "./MatchingPreview";
import OrderingPreview from "./OrderingPreview";
import FillBlanksPreview from "./FillBlanksPreview";
import CategorizationPreview from "./CategorizationPreview";
import { AnyQuestion, QuizType, DragDropQuestion, MatchingQuestion, OrderingQuestion, FillBlanksQuestion, CategorizationQuestion } from "@/types/types";

// Function to detect question type based on properties
function getQuestionType(question: AnyQuestion): QuizType {
  if ('dragItems' in question && 'dropZones' in question) {
    // Check if it's diagram labeling (image layout) vs regular drag-drop
    const dragDropQuestion = question as DragDropQuestion;
    return dragDropQuestion.layoutMode === 'image' ? 'diagram-labeling' : 'drag-drop';
  }
  if ('segments' in question && 'bank' in question && 'blanks' in question) {
    return 'fill-blanks';
  }
  if ('categories' in question && 'items' in question) {
    return 'categorization';
  }
  if ('pairs' in question) {
    return 'matching';
  }
  if ('steps' in question) {
    return 'ordering';
  }
  return '';
}

const previewComponents = {
  "drag-drop": EnhancedDragDropPreview,
  "diagram-labeling": EnhancedDragDropPreview, // Same preview as drag-drop but for image layout
  "matching": MatchingPreview,
  "fill-blanks": FillBlanksPreview,
  "categorization": CategorizationPreview,
  "ordering": OrderingPreview,
};

type Props = {
  question: AnyQuestion;
  type: Exclude<QuizType, "">;
};

export default function PreviewWrapper({ question, type }: Props) {
  // Use the provided type parameter, but fall back to detection if needed
  const detectedType = getQuestionType(question);
  const questionType = type || detectedType;

  const PreviewComponent = previewComponents[questionType as keyof typeof previewComponents];
  
  if (!PreviewComponent) {
    return (
      <div className="text-red-500 p-4 rounded-lg border border-red-200 bg-red-50">
        <div className="font-medium mb-2">Unknown question type: {questionType}</div>
        <div className="text-sm">This question type is not yet supported in the preview.</div>
        <div className="text-xs mt-2">Debug: Provided type: {type}, Detected: {detectedType}</div>
      </div>
    );
  }

  return <PreviewComponent question={question as any} />;
}
