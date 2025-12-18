export type BaseQuestion = {
  prompt: string;
};

// Enhanced Drag & Drop Types
export type DragItem = {
  id: string;
  label: string;
  type: "text" | "image";
  imageUrl?: string; // For image-based drag items
};

export type LayoutMode = "image" | "text";

export type DropZoneShape = "rectangle" | "circle";

export type DropZone = {
  id: string;
  label: string;
  correctItemId: string;
  // Position and dimensions for image-based drop zones (optional for text mode)
  x?: number; // X coordinate as percentage of image width
  y?: number; // Y coordinate as percentage of image height
  width?: number; // Width as percentage of image width
  height?: number; // Height as percentage of image height
  shape?: DropZoneShape;
  // For text-based layout
  order?: number; // Display order for text layout
  description?: string; // Additional description for text zones
};

export type FeedbackConfig = {
  showInstant: boolean; // Show feedback immediately or on completion
  correctMessage: string;
  incorrectMessage: string;
  showCorrectAnswers: boolean; // Show correct answers after completion
};

export type DragDropQuestion = BaseQuestion & {
  dragItems: DragItem[];
  dropZones: DropZone[];
  layoutMode: LayoutMode; // "image" or "text"
  backgroundImage?: string; // Base64 or URL of uploaded image (for image mode)
  backgroundImageName?: string; // Original filename (for image mode)
  showDropZones: boolean; // Whether drop zones are visible to students
  feedbackConfig: FeedbackConfig;
};

// Matching Types
export type MatchPair = {
  id: string;
  left: string;
  right: string;
};

export type MatchingQuestion = BaseQuestion & {
  pairs: MatchPair[];
  feedbackConfig?: FeedbackConfig; // Made optional for consistency
};

// Ordering Types
export type QuizItem = {
  id: string;
  label: string;
};

export type OrderingQuestion = BaseQuestion & {
  steps: QuizItem[];
  feedbackConfig?: FeedbackConfig; // Made optional for consistency
};

// Fill-in-the-Blanks Types
export type TextSegment = {
  id: string;
  type: "text" | "blank";
  text?: string; // Text content for text segments
  blankId?: string; // Reference to blank for blank segments
};

export type BlankItem = {
  id: string;
  correctItemId: string; // Reference to the correct DragItem
};

export type FillBlanksQuestion = BaseQuestion & {
  segments: TextSegment[]; // Text with inline blanks
  bank: DragItem[]; // Available words to drag
  blanks: BlankItem[]; // Blank configurations with correct answers
  shuffleBank?: boolean; // Whether to shuffle the word bank
  feedbackConfig: FeedbackConfig;
};

// Categorization Types
export type Category = {
  id: string;
  label: string;
  description?: string;
};

export type CategorizedItem = DragItem & {
  correctCategoryId: string; // Which category this item belongs to
};

export type CategorizationQuestion = BaseQuestion & {
  categories: Category[]; // Available columns/categories
  items: CategorizedItem[]; // Items to be categorized
  shuffleItems?: boolean; // Whether to shuffle items
  feedbackConfig: FeedbackConfig;
};

export type QuizType = "" | "drag-drop" | "diagram-labeling" | "matching" | "fill-blanks" | "categorization" | "ordering";

export type QuestionMap = {
  "drag-drop": DragDropQuestion;
  "diagram-labeling": DragDropQuestion; // Reuses DragDropQuestion structure
  matching: MatchingQuestion;
  "fill-blanks": FillBlanksQuestion;
  categorization: CategorizationQuestion;
  ordering: OrderingQuestion;
};

export type QuizMeta = {
  grade: string;
  subject: string;
  book: string;
  chapter: string;
  slo: string;
  type: QuizType;
  difficulty?: string;
};

// Union type for all question types
export type AnyQuestion = DragDropQuestion | MatchingQuestion | OrderingQuestion | FillBlanksQuestion | CategorizationQuestion;
