import { Step } from 'react-joyride';

export const teacherQuizzesLibraryTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">Quiz Library</h2>
        <p className="text-gray-700 mb-3">
          This is your quiz management center. View, manage, and track all quizzes you've created.
        </p>
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-gray-700 mb-2 font-semibold">What you can do here:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Filter quizzes by format (Online/Offline) or search by title</li>
            <li>View quiz details including subject, questions, and creation date</li>
            <li>Click on any quiz card to see detailed results and analytics</li>
            <li>Track student attempts and performance</li>
            <li>Grade subjective questions manually</li>
            <li>Delete quizzes you no longer need</li>
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
        <h2 className="text-2xl font-bold text-[#002147] mb-3 font-gibson">Library Mastered!</h2>
        <p className="text-gray-700 mb-3">
          You now know how to manage your quiz library and track student performance effectively.
        </p>
        <p className="text-sm text-gray-500">
          Tip: Regularly check for pending submissions and provide timely feedback to students.
        </p>
      </div>
    ),
  },
];
