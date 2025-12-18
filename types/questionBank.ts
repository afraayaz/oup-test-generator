// Question Bank Types

export interface QuestionOption {
  text: string;
  isCorrect?: boolean;
}

export interface BaseQuestion {
  id: string;
  type: 'mcq' | 'fillblanks' | 'matching' | 'ordering' | 'categorization';
  subject: string;
  grade: string;
  chapter: string;
  book: string;
  content: string;
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: any;
  createdBy: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface OUPQuestion extends BaseQuestion {
  source: 'oup';
  options: string[];
  correctAnswer: string;
  createdByName: string;
}

export interface SchoolQuestion extends BaseQuestion {
  source: 'school';
  schoolId: string;
  options: string[];
  correctAnswer: string;
  createdByName: string;
}

export type Question = OUPQuestion | SchoolQuestion;

export interface QuestionBankStats {
  schoolId?: string;
  schoolName?: string;
  totalQuestions: number;
  questionsBySubject: Record<string, number>;
  questionsByGrade: Record<string, number>;
  questionsByDifficulty: Record<string, number>;
  questionsByType: Record<string, number>;
  lastUpdated: any;
  createdAt?: any;
}

export type UserRole = 
  | 'admin'
  | 'oup-admin'
  | 'oup-creator'
  | 'school-admin'
  | 'teacher'
  | 'moderator'
  | 'content-creator';

export interface QuizCreationData {
  subject: string;
  grade: string;
  book?: string;
  chapter?: string;
  questionBanks: 'oup' | 'school' | 'both';
  selectedQuestionIds: string[];
  questions: Question[];
}
