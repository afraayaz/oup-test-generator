import { Step } from 'react-joyride';

export const teacherQuizGenerationTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">Quiz Generation Wizard</h2>
        <p className="text-gray-700 mb-3">
          Welcome to the quiz generator! This powerful tool helps you create customized quizzes from your question bank quickly and easily.
        </p>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700 mb-2 font-semibold">Quick Guide:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Fill in quiz title and select grade/subject</li>
            <li>Choose books and chapters</li>
            <li>Filter by difficulty and question types</li>
            <li>Select questions from your filtered results</li>
            <li>Set time limit and assign to students</li>
            <li>Click Generate to create your quiz!</li>
          </ul>
        </div>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">Ready to Generate!</h2>
        <p className="text-gray-700 mb-3">
          Start creating engaging quizzes for your students. Mix different question types and difficulty levels for comprehensive assessments.
        </p>
        <p className="text-sm text-gray-500">
          Tip: You can preview questions before adding them to ensure they match your requirements.
        </p>
      </div>
    ),
  },
];
