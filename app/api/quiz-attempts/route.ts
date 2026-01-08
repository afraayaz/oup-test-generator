import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Function to extract cognitive level from question data
function getQuestionCognitiveLevel(item: any): string {
  // Check for cognitiveLevel field (stored cognitive level data)
  if (item.cognitiveLevel) {
    const cl = item.cognitiveLevel;
    // If it's an object with knowledge, understanding, application
    if (typeof cl === 'object') {
      if (cl.application) return 'Application';
      if (cl.understanding) return 'Understanding';
      if (cl.knowledge) return 'Knowledge';
    }
    // If it's a string, use it directly
    if (typeof cl === 'string') return cl;
  }
  
  // Check for cognitiveLevels field (alternative naming)
  if (item.cognitiveLevels) {
    const cl = item.cognitiveLevels;
    if (typeof cl === 'object') {
      if (cl.application) return 'Application';
      if (cl.understanding) return 'Understanding';
      if (cl.knowledge) return 'Knowledge';
    }
  }
  
  // Fallback: return unknown if no cognitive level found
  return 'Unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quizId,
      quizTitle,
      subject = '',  // Subject from quiz
      studentId,
      studentName = 'Unknown Student',  // Student name from auth
      answers,
      score,
      totalMarks,
      percentage,
      timeSpent,
      submittedAt,
      quizItems,
      isMarked = false,  // Get marked status from quiz (default false if not provided)
    } = body;

    if (!quizId || !studentId) {
      return NextResponse.json(
        { error: 'Missing quizId or studentId' },
        { status: 400 }
      );
    }

    // Build detailed results for each question
    const questionResults = (quizItems || []).map((item: any, index: number) => {
      const userAnswer = answers[index];
      let isCorrect = false;
      let attempted = false;
      
      console.log(`[API] Processing question ${index}:`, {
        type: item.questionType,
        userAnswer,
        correctAnswer: item.answer.value,
        userAnswerType: typeof userAnswer,
      });
      
      // Determine if answer is correct based on question type
      if (item.questionType === 'multiple' || item.questionType === 'mcqs') {
        // Multiple choice - direct comparison
        isCorrect = userAnswer && item.answer.value === userAnswer;
        attempted = userAnswer !== null && userAnswer !== undefined;
      } else if (item.questionType === 'truefalse') {
        // True/False - direct comparison
        isCorrect = userAnswer && item.answer.value === userAnswer;
        attempted = userAnswer !== null && userAnswer !== undefined;
      } else if (['fill', 'fillinblank', 'fillblanks'].includes(item.questionType)) {
        // Fill in the blank - compare against correct answers
        if (!userAnswer) {
          isCorrect = false;
          attempted = false;
        } else if (Array.isArray(item.answer.value)) {
          // Multiple blanks stored as array
          attempted = true;
          isCorrect = item.answer.value.every((ans: string, i: number) =>
            ans.toLowerCase().trim() === (userAnswer?.[i] || '').toLowerCase().trim()
          );
        } else if (typeof item.answer.value === 'object' && !Array.isArray(item.answer.value)) {
          // Multiple blanks stored as object {0: answer1, 1: answer2}
          if (typeof userAnswer === 'object') {
            attempted = true;
            isCorrect = Object.keys(item.answer.value).every((key: string) => {
              const correctAns = item.answer.value[key];
              const userAns = userAnswer[key];
              return correctAns && userAns && 
                correctAns.toLowerCase().trim() === userAns.toLowerCase().trim();
            });
          } else {
            isCorrect = false;
            attempted = false;
          }
        } else {
          // Single blank
          attempted = true;
          isCorrect = item.answer.value?.toLowerCase().trim() === userAnswer?.toLowerCase?.()?.trim?.();
        }
      } else if (['short', 'shortanswer', 'long', 'longanswer'].includes(item.questionType)) {
        // For short/long answers, cannot auto-grade, just record attempt
        attempted = userAnswer && userAnswer.toString().trim().length > 0;
        isCorrect = false; // Don't mark as correct, manual grading required
      } else {
        // Unknown type
        isCorrect = false;
        attempted = false;
      }

      console.log(`[API] Question ${index} result:`, { isCorrect, attempted });

      const cognitiveLevel = getQuestionCognitiveLevel(item);

      // Extract question text safely
      let questionText = '';
      if (typeof item.question === 'string') {
        questionText = item.question;
      } else if (typeof item.question === 'object' && item.question?.text) {
        questionText = item.question.text;
      }

      // Extract explanation text safely
      let explanation = '';
      if (item.explanation) {
        if (typeof item.explanation === 'string') {
          explanation = item.explanation;
        } else if (typeof item.explanation === 'object' && item.explanation?.text) {
          explanation = item.explanation.text;
        }
      }

      if (index < 2) {
        console.log(`[API] Question ${index}:`, {
          cognitiveLevel,
          questionType: item.questionType,
          userAnswer,
          correctAnswerValue: item.answer.value,
          isCorrect,
        });
      }

      return {
        questionId: item.questionId,
        questionType: item.questionType,
        questionText,
        difficulty: item.difficulty,
        cognitiveLevel,
        userAnswer: typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer,
        correctAnswer: typeof item.answer.value === 'object' ? JSON.stringify(item.answer.value) : item.answer.value,
        // For MCQ, also store the user answer text for display
        userAnswerText: (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options && userAnswer !== null && userAnswer !== undefined
          ? item.options[userAnswer]?.text || userAnswer
          : null,
        // For MCQ, also store the correct answer text for display
        correctAnswerText: (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options && item.answer.value !== null && item.answer.value !== undefined
          ? item.options[item.answer.value]?.text || item.answer.value
          : null,
        isCorrect,
        attempted,
        status: !attempted ? 'Not Attempted' : (['short', 'shortanswer', 'long', 'longanswer'].includes(item.questionType) ? 'Attempted' : (isCorrect ? 'Correct' : 'Incorrect')),
        marks: item.marks || 1,
        explanation: explanation || null,
      };
    });

    // Calculate cognitive level breakdown
    const cognitiveBreakdown: { [key: string]: { correct: number; total: number; percentage: number } } = {};
    questionResults.forEach((result: any, index: number) => {
      if (!cognitiveBreakdown[result.cognitiveLevel]) {
        cognitiveBreakdown[result.cognitiveLevel] = { correct: 0, total: 0, percentage: 0, questionIndices: [] };
      }
      cognitiveBreakdown[result.cognitiveLevel].total += 1;
      cognitiveBreakdown[result.cognitiveLevel].questionIndices.push(index);
      if (result.isCorrect) {
        cognitiveBreakdown[result.cognitiveLevel].correct += 1;
      }
    });

    // Calculate percentages
    Object.keys(cognitiveBreakdown).forEach(level => {
      cognitiveBreakdown[level].percentage = Math.round(
        (cognitiveBreakdown[level].correct / cognitiveBreakdown[level].total) * 100
      );
    });

    console.log('[API] Final Results:', {
      totalQuestions: questionResults.length,
      cognitiveBreakdown,
      sample: questionResults.slice(0, 2),
    });

    // Save to Firestore using SDK
    const attemptsRef = collection(db, 'quizAttempts');
    const attemptDoc = await addDoc(attemptsRef, {
      quizId: quizId || '',
      quizTitle: quizTitle || 'Quiz',
      subject: subject || '',  // Default to empty string if not provided
      studentId: studentId || '',
      studentName: studentName || 'Unknown Student',  // Save student name
      score: score || 0,
      totalMarks: totalMarks || 0,
      percentage: percentage || 0,
      timeSpent: timeSpent || 0,
      submittedAt: submittedAt || new Date().toISOString(),
      completedAt: submittedAt || new Date().toISOString(),  // Use submittedAt as completedAt for consistency
      createdAt: serverTimestamp(),
      isMarked: isMarked === true,  // Ensure boolean value
      questionResults: questionResults || [],
      cognitiveBreakdown: cognitiveBreakdown || {},
    });

    return NextResponse.json(
      {
        success: true,
        attemptId: attemptDoc.id,
        score,
        percentage,
        questionResults,
        cognitiveBreakdown,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving quiz attempt:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz attempt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
