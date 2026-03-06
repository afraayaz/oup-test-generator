import { Step } from 'react-joyride';

export const studentQuizAttemptTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">Quiz Attempt Interface</h2>
        <p className="text-gray-700 mb-3">
          You're in the quiz attempt page! Here's how to successfully complete your quizzes.
        </p>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700 mb-2 font-semibold">Quick Tips:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Watch the countdown timer at the top</li>
            <li>Use question numbers to jump between questions</li>
            <li>Click options for MCQs, type answers for text questions</li>
            <li>Mark questions for review if you're unsure</li>
            <li>Use Previous/Next buttons to navigate</li>
            <li>Review all answers before submitting</li>
            <li>Submit your quiz before time runs out!</li>
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
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">You're Ready!</h2>
        <p className="text-gray-700 mb-3">
          You now know how to navigate and complete quizzes. Take your time, read carefully, and do your best!
        </p>
        <p className="text-sm text-gray-500">
          Tip: Answer easier questions first, then return to challenging ones.
        </p>
      </div>
    ),
  },
];
