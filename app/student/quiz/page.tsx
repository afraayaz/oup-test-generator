'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  subject: string;
  grade: string;
  type: string;
}

export default function QuizGeneratorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [sloOption, setSloOption] = useState('all');
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState(false);
  const [grade, setGrade] = useState('4'); // Hardcoded to Grade 4
  const [questionType, setQuestionType] = useState('');
  const [quizHistory, setQuizHistory] = useState<
    { id: number; subject: string; grade: string; score: number; date: string }[]
  >([]);

  const sampleQuestions: Question[] = [
    // Math - MCQs
    { id: 1, question: 'What is 5 + 3?', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 2, question: 'What is 12 - 7?', options: ['4', '5', '6', '7'], correctAnswer: '5', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 3, question: 'What is 4 × 3?', options: ['10', '12', '14', '16'], correctAnswer: '12', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 4, question: 'What is 18 ÷ 2?', options: ['7', '8', '9', '10'], correctAnswer: '9', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 5, question: 'Which number is even?', options: ['3', '5', '6', '7'], correctAnswer: '6', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 6, question: 'What is the place value of 5 in 352?', options: ['5', '50', '500', '5000'], correctAnswer: '50', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 7, question: 'What is 15 + 9?', options: ['22', '23', '24', '25'], correctAnswer: '24', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 8, question: 'What is 20 - 8?', options: ['11', '12', '13', '14'], correctAnswer: '12', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 9, question: 'What is 6 × 4?', options: ['20', '22', '24', '26'], correctAnswer: '24', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 10, question: 'What is 24 ÷ 3?', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 11, question: 'Which is a prime number?', options: ['4', '6', '7', '9'], correctAnswer: '7', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 12, question: 'What is 100 - 45?', options: ['50', '55', '60', '65'], correctAnswer: '55', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 13, question: 'What is 7 × 5?', options: ['30', '35', '40', '45'], correctAnswer: '35', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 14, question: 'What is 36 ÷ 4?', options: ['7', '8', '9', '10'], correctAnswer: '9', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 15, question: 'Which is greater: 56 or 65?', options: ['56', '65', 'Equal', 'Neither'], correctAnswer: '65', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 16, question: 'What is 8 + 7?', options: ['13', '14', '15', '16'], correctAnswer: '15', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 17, question: 'What is 9 × 3?', options: ['24', '27', '30', '33'], correctAnswer: '27', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 18, question: 'What is 48 ÷ 6?', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 19, question: 'What is the sum of 12 and 8?', options: ['18', '19', '20', '21'], correctAnswer: '20', subject: 'Math', grade: '4', type: 'mcqs' },
    { id: 20, question: 'What is 15 - 6?', options: ['7', '8', '9', '10'], correctAnswer: '9', subject: 'Math', grade: '4', type: 'mcqs' },

    // Math - Fill in the Blanks
    { id: 21, question: '5 + ___ = 8', options: ['2', '3', '4', '5'], correctAnswer: '3', subject: 'Math', grade: '4', type: 'fill' },
    { id: 22, question: '12 - ___ = 7', options: ['4', '5', '6', '7'], correctAnswer: '5', subject: 'Math', grade: '4', type: 'fill' },
    { id: 23, question: '4 × ___ = 12', options: ['2', '3', '4', '5'], correctAnswer: '3', subject: 'Math', grade: '4', type: 'fill' },
    { id: 24, question: '18 ÷ ___ = 9', options: ['1', '2', '3', '4'], correctAnswer: '2', subject: 'Math', grade: '4', type: 'fill' },
    { id: 25, question: '10 + ___ = 15', options: ['3', '4', '5', '6'], correctAnswer: '5', subject: 'Math', grade: '4', type: 'fill' },
    { id: 26, question: '20 - ___ = 12', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'fill' },
    { id: 27, question: '6 × ___ = 24', options: ['3', '4', '5', '6'], correctAnswer: '4', subject: 'Math', grade: '4', type: 'fill' },
    { id: 28, question: '24 ÷ ___ = 8', options: ['2', '3', '4', '5'], correctAnswer: '3', subject: 'Math', grade: '4', type: 'fill' },
    { id: 29, question: '15 + ___ = 24', options: ['7', '8', '9', '10'], correctAnswer: '9', subject: 'Math', grade: '4', type: 'fill' },
    { id: 30, question: '30 - ___ = 15', options: ['10', '12', '15', '18'], correctAnswer: '15', subject: 'Math', grade: '4', type: 'fill' },
    { id: 31, question: '7 × ___ = 35', options: ['4', '5', '6', '7'], correctAnswer: '5', subject: 'Math', grade: '4', type: 'fill' },
    { id: 32, question: '36 ÷ ___ = 9', options: ['2', '3', '4', '5'], correctAnswer: '4', subject: 'Math', grade: '4', type: 'fill' },
    { id: 33, question: '8 + ___ = 15', options: ['5', '6', '7', '8'], correctAnswer: '7', subject: 'Math', grade: '4', type: 'fill' },
    { id: 34, question: '9 × ___ = 27', options: ['2', '3', '4', '5'], correctAnswer: '3', subject: 'Math', grade: '4', type: 'fill' },
    { id: 35, question: '48 ÷ ___ = 8', options: ['4', '5', '6', '7'], correctAnswer: '6', subject: 'Math', grade: '4', type: 'fill' },
    { id: 36, question: '12 + ___ = 20', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'fill' },
    { id: 37, question: '15 - ___ = 9', options: ['5', '6', '7', '8'], correctAnswer: '6', subject: 'Math', grade: '4', type: 'fill' },
    { id: 38, question: '5 × ___ = 25', options: ['3', '4', '5', '6'], correctAnswer: '5', subject: 'Math', grade: '4', type: 'fill' },
    { id: 39, question: '16 ÷ ___ = 4', options: ['2', '3', '4', '5'], correctAnswer: '4', subject: 'Math', grade: '4', type: 'fill' },
    { id: 40, question: '10 + ___ = 18', options: ['6', '7', '8', '9'], correctAnswer: '8', subject: 'Math', grade: '4', type: 'fill' },

    // Math - True/False
    { id: 41, question: '5 + 3 = 8', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 42, question: '12 - 7 = 6', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 43, question: '4 × 3 = 12', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 44, question: '18 ÷ 2 = 8', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 45, question: '10 + 5 = 15', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 46, question: '20 - 8 = 13', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 47, question: '6 × 4 = 24', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 48, question: '24 ÷ 3 = 7', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 49, question: '15 + 9 = 24', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 50, question: '30 - 15 = 14', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 51, question: '7 × 5 = 35', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 52, question: '36 ÷ 4 = 8', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 53, question: '8 + 7 = 15', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 54, question: '9 × 3 = 26', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 55, question: '48 ÷ 6 = 8', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 56, question: '12 + 8 = 21', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 57, question: '15 - 6 = 9', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 58, question: '5 × 5 = 25', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 59, question: '16 ÷ 4 = 5', options: ['True', 'False'], correctAnswer: 'False', subject: 'Math', grade: '4', type: 'truefalse' },
    { id: 60, question: '10 + 8 = 18', options: ['True', 'False'], correctAnswer: 'True', subject: 'Math', grade: '4', type: 'truefalse' },

    // Science - MCQs
    { id: 61, question: 'What is the main source of energy for Earth?', options: ['Moon', 'Sun', 'Stars', 'Clouds'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 62, question: 'Which planet is closest to the Sun?', options: ['Venus', 'Earth', 'Mercury', 'Mars'], correctAnswer: 'Mercury', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 63, question: 'What gas do plants use for photosynthesis?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'], correctAnswer: 'Carbon Dioxide', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 64, question: 'What is water’s freezing point?', options: ['0°C', '100°C', '50°C', '25°C'], correctAnswer: '0°C', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 65, question: 'Which animal is a mammal?', options: ['Crocodile', 'Python', 'Dolphin', 'Lizard'], correctAnswer: 'Dolphin', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 66, question: 'What is the largest planet?', options: ['Earth', 'Jupiter', 'Mars', 'Venus'], correctAnswer: 'Jupiter', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 67, question: 'What do plants produce during photosynthesis?', options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Water'], correctAnswer: 'Oxygen', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 68, question: 'Which is a renewable resource?', options: ['Coal', 'Oil', 'Solar Energy', 'Natural Gas'], correctAnswer: 'Solar Energy', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 69, question: 'What is the boiling point of water?', options: ['0°C', '50°C', '100°C', '150°C'], correctAnswer: '100°C', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 70, question: 'Which is a conductor of electricity?', options: ['Rubber', 'Plastic', 'Copper', 'Wood'], correctAnswer: 'Copper', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 71, question: 'What is the Earth’s shape?', options: ['Flat', 'Square', 'Sphere', 'Triangle'], correctAnswer: 'Sphere', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 72, question: 'Which is a source of light?', options: ['Moon', 'Sun', 'Earth', 'Clouds'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 73, question: 'What is the main gas in the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], correctAnswer: 'Nitrogen', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 74, question: 'Which animal lays eggs?', options: ['Dog', 'Cat', 'Bird', 'Horse'], correctAnswer: 'Bird', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 75, question: 'What causes day and night?', options: ['Earth’s rotation', 'Sun’s rotation', 'Moon’s orbit', 'Clouds'], correctAnswer: 'Earth’s rotation', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 76, question: 'Which is a solid?', options: ['Water', 'Air', 'Ice', 'Steam'], correctAnswer: 'Ice', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 77, question: 'What is the center of the solar system?', options: ['Earth', 'Moon', 'Sun', 'Mars'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 78, question: 'Which is a non-renewable resource?', options: ['Wind', 'Coal', 'Solar', 'Water'], correctAnswer: 'Coal', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 79, question: 'What do plants need to grow?', options: ['Darkness', 'Water', 'Sand', 'Rocks'], correctAnswer: 'Water', subject: 'Science', grade: '4', type: 'mcqs' },
    { id: 80, question: 'Which is a liquid?', options: ['Ice', 'Water', 'Steam', 'Rock'], correctAnswer: 'Water', subject: 'Science', grade: '4', type: 'mcqs' },

    // Science - Fill in the Blanks
    { id: 81, question: 'The main source of energy for Earth is the ___.', options: ['Moon', 'Sun', 'Stars', 'Clouds'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'fill' },
    { id: 82, question: 'The closest planet to the Sun is ___.', options: ['Venus', 'Earth', 'Mercury', 'Mars'], correctAnswer: 'Mercury', subject: 'Science', grade: '4', type: 'fill' },
    { id: 83, question: 'Plants use ___ for photosynthesis.', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'], correctAnswer: 'Carbon Dioxide', subject: 'Science', grade: '4', type: 'fill' },
    { id: 84, question: 'Water freezes at ___°C.', options: ['0', '100', '50', '25'], correctAnswer: '0', subject: 'Science', grade: '4', type: 'fill' },
    { id: 85, question: 'A ___ is a mammal.', options: ['Crocodile', 'Python', 'Dolphin', 'Lizard'], correctAnswer: 'Dolphin', subject: 'Science', grade: '4', type: 'fill' },
    { id: 86, question: 'The largest planet is ___.', options: ['Earth', 'Jupiter', 'Mars', 'Venus'], correctAnswer: 'Jupiter', subject: 'Science', grade: '4', type: 'fill' },
    { id: 87, question: 'Plants produce ___ during photosynthesis.', options: ['Carbon Dioxide', 'Oxygen', 'Nitrogen', 'Water'], correctAnswer: 'Oxygen', subject: 'Science', grade: '4', type: 'fill' },
    { id: 88, question: '___ is a renewable resource.', options: ['Coal', 'Oil', 'Solar Energy', 'Natural Gas'], correctAnswer: 'Solar Energy', subject: 'Science', grade: '4', type: 'fill' },
    { id: 89, question: 'Water boils at ___°C.', options: ['0', '50', '100', '150'], correctAnswer: '100', subject: 'Science', grade: '4', type: 'fill' },
    { id: 90, question: '___ is a conductor of electricity.', options: ['Rubber', 'Plastic', 'Copper', 'Wood'], correctAnswer: 'Copper', subject: 'Science', grade: '4', type: 'fill' },
    { id: 91, question: 'The Earth’s shape is a ___.', options: ['Flat', 'Square', 'Sphere', 'Triangle'], correctAnswer: 'Sphere', subject: 'Science', grade: '4', type: 'fill' },
    { id: 92, question: 'The ___ is a source of light.', options: ['Moon', 'Sun', 'Earth', 'Clouds'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'fill' },
    { id: 93, question: 'The main gas in the atmosphere is ___.', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], correctAnswer: 'Nitrogen', subject: 'Science', grade: '4', type: 'fill' },
    { id: 94, question: 'A ___ lays eggs.', options: ['Dog', 'Cat', 'Bird', 'Horse'], correctAnswer: 'Bird', subject: 'Science', grade: '4', type: 'fill' },
    { id: 95, question: '___ causes day and night.', options: ['Earth’s rotation', 'Sun’s rotation', 'Moon’s orbit', 'Clouds'], correctAnswer: 'Earth’s rotation', subject: 'Science', grade: '4', type: 'fill' },
    { id: 96, question: '___ is a solid.', options: ['Water', 'Air', 'Ice', 'Steam'], correctAnswer: 'Ice', subject: 'Science', grade: '4', type: 'fill' },
    { id: 97, question: 'The center of the solar system is the ___.', options: ['Earth', 'Moon', 'Sun', 'Mars'], correctAnswer: 'Sun', subject: 'Science', grade: '4', type: 'fill' },
    { id: 98, question: '___ is a non-renewable resource.', options: ['Wind', 'Coal', 'Solar', 'Water'], correctAnswer: 'Coal', subject: 'Science', grade: '4', type: 'fill' },
    { id: 99, question: 'Plants need ___ to grow.', options: ['Darkness', 'Water', 'Sand', 'Rocks'], correctAnswer: 'Water', subject: 'Science', grade: '4', type: 'fill' },
    { id: 100, question: '___ is a liquid.', options: ['Ice', 'Water', 'Steam', 'Rock'], correctAnswer: 'Water', subject: 'Science', grade: '4', type: 'fill' },

    // Science - True/False
    { id: 101, question: 'The Sun is the main source of energy for Earth.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 102, question: 'Mercury is the farthest planet from the Sun.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 103, question: 'Plants use carbon dioxide for photosynthesis.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 104, question: 'Water freezes at 100°C.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 105, question: 'Dolphins are mammals.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 106, question: 'Jupiter is the smallest planet.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 107, question: 'Plants produce oxygen during photosynthesis.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 108, question: 'Coal is a renewable resource.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 109, question: 'Water boils at 100°C.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 110, question: 'Rubber is a conductor of electricity.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 111, question: 'The Earth is a sphere.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 112, question: 'The Moon is a source of light.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 113, question: 'Nitrogen is the main gas in the atmosphere.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 114, question: 'Dogs lay eggs.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 115, question: 'Earth’s rotation causes day and night.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 116, question: 'Air is a solid.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 117, question: 'The Sun is the center of the solar system.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 118, question: 'Wind is a non-renewable resource.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 119, question: 'Plants need water to grow.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Science', grade: '4', type: 'truefalse' },
    { id: 120, question: 'Steam is a liquid.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Science', grade: '4', type: 'truefalse' },

    // Urdu - MCQs
    { id: 121, question: 'اردو زبان کا سب سے مشہور شاعر کون ہے؟', options: ['علامہ اقبال', 'میر تقی میر', 'غالب', 'فیض احمد فیض'], correctAnswer: 'علامہ اقبال', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 122, question: 'اردو کا پہلا ناول کون سا ہے؟', options: ['میرات العروس', 'فسانہ عجائب', 'دیوان غالب', 'باغ و بہار'], correctAnswer: 'میرات العروس', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 123, question: 'اردو میں "کتاب" کا مطلب کیا ہے؟', options: ['قلم', 'کاغذ', 'کتابچہ', 'کتاب'], correctAnswer: 'کتاب', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 124, question: 'اردو حروف تہجی کتنے ہیں؟', options: ['36', '37', '38', '39'], correctAnswer: '38', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 125, question: '"شیر" کا متضاد لفظ کیا ہے؟', options: ['ببر', 'چیتا', 'بلی', 'کتا'], correctAnswer: 'بلی', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 126, question: 'اردو میں "سورج" کا مترادف کیا ہے؟', options: ['چاند', 'آفتاب', 'ستارہ', 'بادل'], correctAnswer: 'آفتاب', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 127, question: 'اردو کا قومی شاعر کون ہے؟', options: ['غالب', 'علامہ اقبال', 'میر تقی میر', 'احمد فراز'], correctAnswer: 'علامہ اقبال', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 128, question: '"پانی" کا متضاد لفظ کیا ہے؟', options: ['آگ', 'ہوا', 'مٹی', 'دھوپ'], correctAnswer: 'آگ', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 129, question: 'اردو میں "مکتب" کا مطلب کیا ہے؟', options: ['مدرسہ', 'گھر', 'بازار', 'مسجد'], correctAnswer: 'مدرسہ', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 130, question: '"خاموش" کا مترادف کیا ہے؟', options: ['شور', 'چپ', 'آواز', 'ہنگامہ'], correctAnswer: 'چپ', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 131, question: 'اردو میں "چاند" کا متضاد کیا ہے؟', options: ['سورج', 'ستارہ', 'بادل', 'رات'], correctAnswer: 'سورج', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 132, question: 'اردو کا مشہور ناول نگار کون ہے؟', options: ['پریم چند', 'غالب', 'اقبال', 'فیض'], correctAnswer: 'پریم چند', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 133, question: '"درخت" کا مترادف کیا ہے؟', options: ['پودا', 'شجر', 'گھاس', 'پھول'], correctAnswer: 'شجر', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 134, question: 'اردو میں "امتحان" کا مطلب کیا ہے؟', options: ['کھیل', 'پڑھائی', 'ٹیسٹ', 'تعطیل'], correctAnswer: 'ٹیسٹ', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 135, question: '"بڑا" کا متضاد لفظ کیا ہے؟', options: ['چھوٹا', 'لمبا', 'موٹا', 'پتلا'], correctAnswer: 'چھوٹا', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 136, question: 'اردو میں "قلم" کا مترادف کیا ہے؟', options: ['پنسل', 'ربر', 'کاغذ', 'پن'], correctAnswer: 'پنسل', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 137, question: '"رات" کا متضاد کیا ہے؟', options: ['دن', 'چاند', 'ستارہ', 'بادل'], correctAnswer: 'دن', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 138, question: 'اردو میں "دوست" کا مطلب کیا ہے؟', options: ['دشمن', 'یار', 'بیک وقت', 'غریب'], correctAnswer: 'یار', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 139, question: '"تیز" کا متضاد لفظ کیا ہے؟', options: ['دھیما', 'تیز', 'بلند', 'نیچا'], correctAnswer: 'دھیما', subject: 'Urdu', grade: '4', type: 'mcqs' },
    { id: 140, question: 'اردو میں "گھر" کا مترادف کیا ہے؟', options: ['مکان', 'بازار', 'مدرسہ', 'مسجد'], correctAnswer: 'مکان', subject: 'Urdu', grade: '4', type: 'mcqs' },

    // Urdu - Fill in the Blanks
    { id: 141, question: 'اردو زبان کا سب سے مشہور شاعر ___ ہے۔', options: ['علامہ اقبال', 'میر تقی میر', 'غالب', 'فیض احمد فیض'], correctAnswer: 'علامہ اقبال', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 142, question: 'اردو کا پہلا ناول ___ ہے۔', options: ['میرات العروس', 'فسانہ عجائب', 'دیوان غالب', 'باغ و بہار'], correctAnswer: 'میرات العروس', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 143, question: 'اردو میں "کتاب" کا مطلب ___ ہے۔', options: ['قلم', 'کاغذ', 'کتابچہ', 'کتاب'], correctAnswer: 'کتاب', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 144, question: 'اردو حروف تہجی ___ ہیں۔', options: ['36', '37', '38', '39'], correctAnswer: '38', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 145, question: '"شیر" کا متضاد لفظ ___ ہے۔', options: ['ببر', 'چیتا', 'بلی', 'کتا'], correctAnswer: 'بلی', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 146, question: 'اردو میں "سورج" کا مترادف ___ ہے۔', options: ['چاند', 'آفتاب', 'ستارہ', 'بادل'], correctAnswer: 'آفتاب', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 147, question: 'اردو کا قومی شاعر ___ ہے۔', options: ['غالب', 'علامہ اقبال', 'میر تقی میر', 'احمد فراز'], correctAnswer: 'علامہ اقبال', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 148, question: '"پانی" کا متضاد لفظ ___ ہے۔', options: ['آگ', 'ہوا', 'مٹی', 'دھوپ'], correctAnswer: 'آگ', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 149, question: 'اردو میں "مکتب" کا مطلب ___ ہے۔', options: ['مدرسہ', 'گھر', 'بازار', 'مسجد'], correctAnswer: 'مدرسہ', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 150, question: '"خاموش" کا مترادف ___ ہے۔', options: ['شور', 'چپ', 'آواز', 'ہنگامہ'], correctAnswer: 'چپ', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 151, question: 'اردو میں "چاند" کا متضاد ___ ہے۔', options: ['سورج', 'ستارہ', 'بادل', 'رات'], correctAnswer: 'سورج', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 152, question: 'اردو کا مشہور ناول نگار ___ ہے۔', options: ['پریم چند', 'غالب', 'اقبال', 'فیض'], correctAnswer: 'پریم چند', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 153, question: '"درخت" کا مترادف ___ ہے۔', options: ['پودا', 'شجر', 'گھاس', 'پھول'], correctAnswer: 'شجر', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 154, question: 'اردو میں "امتحان" کا مطلب ___ ہے۔', options: ['کھیل', 'پڑھائی', 'ٹیسٹ', 'تعطیل'], correctAnswer: 'ٹیسٹ', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 155, question: '"بڑا" کا متضاد لفظ ___ ہے۔', options: ['چھوٹا', 'لمبا', 'موٹا', 'پتلا'], correctAnswer: 'چھوٹا', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 156, question: 'اردو میں "قلم" کا مترادف ___ ہے۔', options: ['پنسل', 'ربر', 'کاغذ', 'پن'], correctAnswer: 'پنسل', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 157, question: '"رات" کا متضاد ___ ہے۔', options: ['دن', 'چاند', 'ستارہ', 'بادل'], correctAnswer: 'دن', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 158, question: 'اردو میں "دوست" کا مطلب ___ ہے۔', options: ['دشمن', 'یار', 'بیک وقت', 'غریب'], correctAnswer: 'یار', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 159, question: '"تیز" کا متضاد لفظ ___ ہے۔', options: ['دھیما', 'تیز', 'بلند', 'نیچا'], correctAnswer: 'دھیما', subject: 'Urdu', grade: '4', type: 'fill' },
    { id: 160, question: 'اردو میں "گھر" کا مترادف ___ ہے۔', options: ['مکان', 'بازار', 'مدرسہ', 'مسجد'], correctAnswer: 'مکان', subject: 'Urdu', grade: '4', type: 'fill' },

    // Urdu - True/False
    { id: 161, question: 'علامہ اقبال اردو کے قومی شاعر ہیں۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 162, question: 'اردو کا پہلا ناول فسانہ عجائب ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 163, question: 'اردو حروف تہجی 38 ہیں۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 164, question: '"شیر" کا متضاد کتا ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 165, question: '"سورج" کا مترادف آفتاب ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 166, question: '"پانی" کا متضاد ہوا ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 167, question: 'اردو میں "مکتب" کا مطلب مدرسہ ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 168, question: '"خاموش" کا مترادف شور ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 169, question: '"چاند" کا متضاد سورج ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 170, question: 'پریم چند اردو کے مشہور شاعر ہیں۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 171, question: '"درخت" کا مترادف شجر ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 172, question: 'اردو میں "امتحان" کا مطلب کھیل ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 173, question: '"بڑا" کا متضاد چھوٹا ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 174, question: 'اردو میں "قلم" کا مترادف ربر ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 175, question: '"رات" کا متضاد دن ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 176, question: 'اردو میں "دوست" کا مطلب دشمن ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 177, question: '"تیز" کا متضاد دھیما ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 178, question: 'اردو میں "گھر" کا مترادف مکان ہے۔', options: ['درست', 'غلط'], correctAnswer: 'درست', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 179, question: 'اردو میں "مکتب" کا مطلب بازار ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },
    { id: 180, question: '"خاموش" کا متضاد آواز ہے۔', options: ['درست', 'غلط'], correctAnswer: 'غلط', subject: 'Urdu', grade: '4', type: 'truefalse' },

    // Computer - MCQs
    { id: 181, question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit', 'Central Power Unit'], correctAnswer: 'Central Processing Unit', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 182, question: 'Which is an input device?', options: ['Monitor', 'Keyboard', 'Printer', 'Speaker'], correctAnswer: 'Keyboard', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 183, question: 'What is the full form of RAM?', options: ['Read Access Memory', 'Random Access Memory', 'Run Access Memory', 'Real Access Memory'], correctAnswer: 'Random Access Memory', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 184, question: 'Which is a storage device?', options: ['Mouse', 'Hard Disk', 'Monitor', 'Keyboard'], correctAnswer: 'Hard Disk', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 185, question: 'What is an operating system?', options: ['Hardware', 'Software', 'Network', 'Printer'], correctAnswer: 'Software', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 186, question: 'Which is an output device?', options: ['Scanner', 'Mouse', 'Monitor', 'Keyboard'], correctAnswer: 'Monitor', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 187, question: 'What does USB stand for?', options: ['Universal Serial Bus', 'Unique System Bus', 'Universal System Bus', 'Unique Serial Bus'], correctAnswer: 'Universal Serial Bus', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 188, question: 'Which key is used to delete text?', options: ['Enter', 'Backspace', 'Shift', 'Ctrl'], correctAnswer: 'Backspace', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 189, question: 'What is a web browser?', options: ['Hardware', 'Software', 'Network', 'Printer'], correctAnswer: 'Software', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 190, question: 'Which is a pointing device?', options: ['Mouse', 'Monitor', 'Printer', 'Speaker'], correctAnswer: 'Mouse', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 191, question: 'What does ROM stand for?', options: ['Read Only Memory', 'Random Only Memory', 'Run Only Memory', 'Real Only Memory'], correctAnswer: 'Read Only Memory', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 192, question: 'Which is a type of software?', options: ['CPU', 'Application', 'Monitor', 'Keyboard'], correctAnswer: 'Application', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 193, question: 'What is the brain of the computer?', options: ['Monitor', 'CPU', 'Keyboard', 'Mouse'], correctAnswer: 'CPU', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 194, question: 'Which is a peripheral device?', options: ['CPU', 'RAM', 'Printer', 'Motherboard'], correctAnswer: 'Printer', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 195, question: 'What is used to type text?', options: ['Mouse', 'Keyboard', 'Monitor', 'Printer'], correctAnswer: 'Keyboard', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 196, question: 'Which is a type of memory?', options: ['CPU', 'RAM', 'Monitor', 'Keyboard'], correctAnswer: 'RAM', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 197, question: 'What does LAN stand for?', options: ['Local Area Network', 'Large Area Network', 'Long Area Network', 'Light Area Network'], correctAnswer: 'Local Area Network', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 198, question: 'Which is an example of an operating system?', options: ['Windows', 'Mouse', 'Monitor', 'Printer'], correctAnswer: 'Windows', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 199, question: 'What is used to display output?', options: ['Keyboard', 'Mouse', 'Monitor', 'Printer'], correctAnswer: 'Monitor', subject: 'Computer', grade: '4', type: 'mcqs' },
    { id: 200, question: 'Which is a type of computer?', options: ['Laptop', 'Table', 'Chair', 'Book'], correctAnswer: 'Laptop', subject: 'Computer', grade: '4', type: 'mcqs' },

    // Computer - Fill in the Blanks
    { id: 201, question: 'CPU stands for ___.', options: ['Central Processing Unit', 'Computer Personal Unit', 'Control Processing Unit', 'Central Power Unit'], correctAnswer: 'Central Processing Unit', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 202, question: 'A ___ is an input device.', options: ['Monitor', 'Keyboard', 'Printer', 'Speaker'], correctAnswer: 'Keyboard', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 203, question: 'RAM stands for ___.', options: ['Read Access Memory', 'Random Access Memory', 'Run Access Memory', 'Real Access Memory'], correctAnswer: 'Random Access Memory', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 204, question: 'A ___ is a storage device.', options: ['Mouse', 'Hard Disk', 'Monitor', 'Keyboard'], correctAnswer: 'Hard Disk', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 205, question: 'An operating system is ___.', options: ['Hardware', 'Software', 'Network', 'Printer'], correctAnswer: 'Software', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 206, question: 'A ___ is an output device.', options: ['Scanner', 'Mouse', 'Monitor', 'Keyboard'], correctAnswer: 'Monitor', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 207, question: 'USB stands for ___.', options: ['Universal Serial Bus', 'Unique System Bus', 'Universal System Bus', 'Unique Serial Bus'], correctAnswer: 'Universal Serial Bus', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 208, question: 'The ___ key is used to delete text.', options: ['Enter', 'Backspace', 'Shift', 'Ctrl'], correctAnswer: 'Backspace', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 209, question: 'A web browser is ___.', options: ['Hardware', 'Software', 'Network', 'Printer'], correctAnswer: 'Software', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 210, question: 'A ___ is a pointing device.', options: ['Mouse', 'Monitor', 'Printer', 'Speaker'], correctAnswer: 'Mouse', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 211, question: 'ROM stands for ___.', options: ['Read Only Memory', 'Random Only Memory', 'Run Only Memory', 'Real Only Memory'], correctAnswer: 'Read Only Memory', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 212, question: 'A ___ is a type of software.', options: ['CPU', 'Application', 'Monitor', 'Keyboard'], correctAnswer: 'Application', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 213, question: 'The brain of the computer is the ___.', options: ['Monitor', 'CPU', 'Keyboard', 'Mouse'], correctAnswer: 'CPU', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 214, question: 'A ___ is a peripheral device.', options: ['CPU', 'RAM', 'Printer', 'Motherboard'], correctAnswer: 'Printer', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 215, question: 'A ___ is used to type text.', options: ['Mouse', 'Keyboard', 'Monitor', 'Printer'], correctAnswer: 'Keyboard', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 216, question: 'A ___ is a type of memory.', options: ['CPU', 'RAM', 'Monitor', 'Keyboard'], correctAnswer: 'RAM', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 217, question: 'LAN stands for ___.', options: ['Local Area Network', 'Large Area Network', 'Long Area Network', 'Light Area Network'], correctAnswer: 'Local Area Network', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 218, question: '___ is an example of an operating system.', options: ['Windows', 'Mouse', 'Monitor', 'Printer'], correctAnswer: 'Windows', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 219, question: 'A ___ is used to display output.', options: ['Keyboard', 'Mouse', 'Monitor', 'Printer'], correctAnswer: 'Monitor', subject: 'Computer', grade: '4', type: 'fill' },
    { id: 220, question: 'A ___ is a type of computer.', options: ['Laptop', 'Table', 'Chair', 'Book'], correctAnswer: 'Laptop', subject: 'Computer', grade: '4', type: 'fill' },

    // Computer - True/False
    { id: 221, question: 'CPU stands for Central Processing Unit.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 222, question: 'A monitor is an input device.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 223, question: 'RAM stands for Random Access Memory.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 224, question: 'A mouse is a storage device.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 225, question: 'An operating system is software.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 226, question: 'A keyboard is an output device.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 227, question: 'USB stands for Universal Serial Bus.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 228, question: 'The Enter key is used to delete text.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 229, question: 'A web browser is software.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 230, question: 'A monitor is a pointing device.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 231, question: 'ROM stands for Read Only Memory.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 232, question: 'A CPU is a type of software.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 233, question: 'The CPU is the brain of the computer.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 234, question: 'A CPU is a peripheral device.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 235, question: 'A keyboard is used to type text.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 236, question: 'A monitor is a type of memory.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 237, question: 'LAN stands for Local Area Network.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 238, question: 'A mouse is an example of an operating system.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 239, question: 'A monitor is used to display output.', options: ['True', 'False'], correctAnswer: 'True', subject: 'Computer', grade: '4', type: 'truefalse' },
    { id: 240, question: 'A table is a type of computer.', options: ['True', 'False'], correctAnswer: 'False', subject: 'Computer', grade: '4', type: 'truefalse' },

    // English - MCQs
    { id: 241, question: 'What is the plural of "cat"?', options: ['Cats', 'Cat', 'Cates', 'Catses'], correctAnswer: 'Cats', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 242, question: 'Which is a pronoun?', options: ['Run', 'He', 'Big', 'House'], correctAnswer: 'He', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 243, question: 'What is the past tense of "go"?', options: ['Goes', 'Went', 'Gone', 'Going'], correctAnswer: 'Went', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 244, question: 'Which is an adjective?', options: ['Big', 'Run', 'Book', 'I'], correctAnswer: 'Big', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 245, question: 'What is the opposite of "big"?', options: ['Small', 'Large', 'Huge', 'Tall'], correctAnswer: 'Small', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 246, question: 'Which is a verb?', options: ['House', 'Run', 'Blue', 'Table'], correctAnswer: 'Run', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 247, question: 'What is the plural of "child"?', options: ['Childs', 'Children', 'Childes', 'Childrens'], correctAnswer: 'Children', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 248, question: 'Which is a noun?', options: ['Run', 'Big', 'Book', 'Fast'], correctAnswer: 'Book', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 249, question: 'What is the past tense of "eat"?', options: ['Eats', 'Ate', 'Eaten', 'Eating'], correctAnswer: 'Ate', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 250, question: 'Which is an adverb?', options: ['Quickly', 'Table', 'Blue', 'House'], correctAnswer: 'Quickly', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 251, question: 'What is the opposite of "hot"?', options: ['Warm', 'Cold', 'Cool', 'Burning'], correctAnswer: 'Cold', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 252, question: 'Which is a preposition?', options: ['Run', 'Big', 'On', 'House'], correctAnswer: 'On', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 253, question: 'What is the plural of "foot"?', options: ['Foots', 'Feet', 'Feets', 'Footes'], correctAnswer: 'Feet', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 254, question: 'Which is a conjunction?', options: ['And', 'Run', 'Big', 'House'], correctAnswer: 'And', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 255, question: 'What is the past tense of "see"?', options: ['Sees', 'Saw', 'Seen', 'Seeing'], correctAnswer: 'Saw', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 256, question: 'Which is an article?', options: ['Run', 'The', 'Big', 'House'], correctAnswer: 'The', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 257, question: 'What is the opposite of "fast"?', options: ['Quick', 'Slow', 'Rapid', 'Speedy'], correctAnswer: 'Slow', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 258, question: 'Which is a singular noun?', options: ['Books', 'Dog', 'Cats', 'Children'], correctAnswer: 'Dog', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 259, question: 'What is the past tense of "run"?', options: ['Runs', 'Ran', 'Running', 'Runed'], correctAnswer: 'Ran', subject: 'English', grade: '4', type: 'mcqs' },
    { id: 260, question: 'Which is an exclamation?', options: ['Wow', 'Run', 'Big', 'House'], correctAnswer: 'Wow', subject: 'English', grade: '4', type: 'mcqs' },

    // English - Fill in the Blanks
    { id: 261, question: 'The plural of "cat" is ___.', options: ['Cats', 'Cat', 'Cates', 'Catses'], correctAnswer: 'Cats', subject: 'English', grade: '4', type: 'fill' },
    { id: 262, question: '___ is a pronoun.', options: ['Run', 'He', 'Big', 'House'], correctAnswer: 'He', subject: 'English', grade: '4', type: 'fill' },
    { id: 263, question: 'The past tense of "go" is ___.', options: ['Goes', 'Went', 'Gone', 'Going'], correctAnswer: 'Went', subject: 'English', grade: '4', type: 'fill' },
    { id: 264, question: '___ is an adjective.', options: ['Big', 'Run', 'Book', 'I'], correctAnswer: 'Big', subject: 'English', grade: '4', type: 'fill' },
    { id: 265, question: 'The opposite of "big" is ___.', options: ['Small', 'Large', 'Huge', 'Tall'], correctAnswer: 'Small', subject: 'English', grade: '4', type: 'fill' },
    { id: 266, question: '___ is a verb.', options: ['House', 'Run', 'Blue', 'Table'], correctAnswer: 'Run', subject: 'English', grade: '4', type: 'fill' },
    { id: 267, question: 'The plural of "child" is ___.', options: ['Childs', 'Children', 'Childes', 'Childrens'], correctAnswer: 'Children', subject: 'English', grade: '4', type: 'fill' },
    { id: 268, question: '___ is a noun.', options: ['Run', 'Big', 'Book', 'Fast'], correctAnswer: 'Book', subject: 'English', grade: '4', type: 'fill' },
    { id: 269, question: 'The past tense of "eat" is ___.', options: ['Eats', 'Ate', 'Eaten', 'Eating'], correctAnswer: 'Ate', subject: 'English', grade: '4', type: 'fill' },
    { id: 270, question: '___ is an adverb.', options: ['Quickly', 'Table', 'Blue', 'House'], correctAnswer: 'Quickly', subject: 'English', grade: '4', type: 'fill' },
    { id: 271, question: 'The opposite of "hot" is ___.', options: ['Warm', 'Cold', 'Cool', 'Burning'], correctAnswer: 'Cold', subject: 'English', grade: '4', type: 'fill' },
    { id: 272, question: '___ is a preposition.', options: ['Run', 'Big', 'On', 'House'], correctAnswer: 'On', subject: 'English', grade: '4', type: 'fill' },
    { id: 273, question: 'The plural of "foot" is ___.', options: ['Foots', 'Feet', 'Feets', 'Footes'], correctAnswer: 'Feet', subject: 'English', grade: '4', type: 'fill' },
    { id: 274, question: '___ is a conjunction.', options: ['And', 'Run', 'Big', 'House'], correctAnswer: 'And', subject: 'English', grade: '4', type: 'fill' },
    { id: 275, question: 'The past tense of "see" is ___.', options: ['Sees', 'Saw', 'Seen', 'Seeing'], correctAnswer: 'Saw', subject: 'English', grade: '4', type: 'fill' },
    { id: 276, question: '___ is an article.', options: ['Run', 'The', 'Big', 'House'], correctAnswer: 'The', subject: 'English', grade: '4', type: 'fill' },
    { id: 277, question: 'The opposite of "fast" is ___.', options: ['Quick', 'Slow', 'Rapid', 'Speedy'], correctAnswer: 'Slow', subject: 'English', grade: '4', type: 'fill' },
    { id: 278, question: '___ is a singular noun.', options: ['Books', 'Dog', 'Cats', 'Children'], correctAnswer: 'Dog', subject: 'English', grade: '4', type: 'fill' },
    { id: 279, question: 'The past tense of "run" is ___.', options: ['Runs', 'Ran', 'Running', 'Runed'], correctAnswer: 'Ran', subject: 'English', grade: '4', type: 'fill' },
    { id: 280, question: '___ is an exclamation.', options: ['Wow', 'Run', 'Big', 'House'], correctAnswer: 'Wow', subject: 'English', grade: '4', type: 'fill' },

    // English - True/False
    { id: 281, question: 'The plural of "cat" is "cats".', options: ['True', 'False'], correctAnswer: 'True', subject: 'English', grade: '4', type: 'truefalse' },
    { id: 282, question: '"He" is a verb.', options: ['True', 'False'], correctAnswer: 'False', subject: 'English', grade: '4', type: 'truefalse' },
  ];

  const handleGenerateQuiz = () => {
    if (!subject || !questionType) {
      alert('Please select both subject and question type.');
      return;
    }

    const filteredQuestions = sampleQuestions.filter(
      (q) =>
        q.subject === subject &&
        q.grade === grade &&
        q.type === questionType
    );

    if (filteredQuestions.length === 0) {
      alert(`No questions available for ${subject} in Grade ${grade} (${questionType}).`);
      return;
    }

    setQuestions(filteredQuestions);
    setQuizStarted(true);
    setShowResults(false);
    setAnswers({});
  };

  const handleAnswerChange = (questionId: number, selected: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: selected }));
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);

    const score = calculateScore();
    const newRecord = {
      id: Date.now(),
      subject,
      grade,
      score,
      date: new Date().toLocaleDateString(),
    };

    const existingHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
    localStorage.setItem('quizHistory', JSON.stringify([...existingHistory, newRecord]));
    setQuizHistory([...existingHistory, newRecord]);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) score++;
    });
    return score;
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole="Student" currentPage="generate" open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-64 p-4 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Generate Quiz</h1>
        </div>

        {!quizStarted && (
          <div className="space-y-4 max-w-xl">
            <p className="text-sm text-gray-700"><strong>Grade:</strong> Grade 4</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">-- Choose Subject --</option>
                <option value="Math">Math</option>
                <option value="Science">Science</option>
                <option value="Urdu">Urdu</option>
                <option value="Computer">Computer</option>
                <option value="English">English</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Question Type</label>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">-- Choose Type --</option>
                <option value="mcqs">MCQs</option>
                <option value="fill">Fill in the Blanks</option>
                <option value="truefalse">True/False</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose SLO Option</label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="all"
                    checked={sloOption === 'all'}
                    onChange={() => setSloOption('all')}
                  />
                  <span>All SLOs</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="single"
                    checked={sloOption === 'single'}
                    onChange={() => setSloOption('single')}
                  />
                  <span>Single SLO</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              className="min-w-[44px] min-h-[44px] bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Generate Quiz
            </button>
          </div>
        )}

        {quizStarted && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Attempt Quiz</h2>
            {questions.map((q) => (
              <div key={q.id} className="bg-white p-4 rounded-lg border space-y-2">
                <p className="font-medium">{q.question}</p>
                <div className="space-y-1">
                  {q.options.map((opt) => (
                    <label key={opt} className="block">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswerChange(q.id, opt)}
                        className="mr-2"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
                {showResults && (
                  <p className={`text-sm mt-2 ${answers[q.id] === q.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                    {answers[q.id] === q.correctAnswer
                      ? 'Correct!'
                      : `Incorrect. Correct answer: ${q.correctAnswer}`}
                  </p>
                )}
              </div>
            ))}

            {!showResults ? (
              <button
                onClick={handleSubmitQuiz}
                className="min-w-[44px] min-h-[44px] bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Submit Quiz
              </button>
            ) : (
              <div className="mt-4 space-y-6">
                <div className="text-lg font-semibold text-gray-800">
                  Your Score: {calculateScore()} / {questions.length}
                </div>

                {/* <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Quiz History</h3>
                  <ul className="text-sm text-gray-700 space-y-2">
                    {quizHistory.map((record) => (
                      <li key={record.id} className="border p-3 rounded-lg bg-white">
                        <p><strong>Subject:</strong> {record.subject}</p>
                        <p><strong>Grade:</strong> {record.grade}</p>
                        <p><strong>Score:</strong> {record.score}</p>
                        <p><strong>Date:</strong> {record.date}</p>
                      </li>
                    ))}
                  </ul>
                </div> */}

                <div className="text-center">
                  <button
                    onClick={() => {
                      setQuizStarted(false);
                      setShowResults(false);
                      setAnswers({});
                      setSubject('');
                      setQuestionType('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="min-w-[44px] min-h-[44px] bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Create Another Quiz
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

            {quizStarted && (
        <aside className="w-80 bg-white border-l border-gray-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">Quiz Summary</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p><strong>Grade:</strong> {grade}</p>
            <p><strong>Subject:</strong> {subject}</p>
            <p><strong>SLO Option:</strong> {sloOption === 'all' ? 'All SLOs' : 'Single SLO'}</p>
            <p><strong>Questions Requested:</strong> {questions.length}</p>
            <p><strong>Questions Available:</strong> {questions.length}</p>
          </div>
        </aside>
      )}
    </div>
  );
}
