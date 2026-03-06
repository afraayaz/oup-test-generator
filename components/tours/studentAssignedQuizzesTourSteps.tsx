import { Step } from 'react-joyride';

export const studentAssignedQuizzesTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Assigned Quizzes</h2>
        <p className="text-gray-700 text-sm">
          View and attempt all quizzes assigned by your teachers.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.filter-tabs',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Filter Tabs</h3>
        <p className="text-gray-700 text-sm">
          Switch between All, Upcoming, and Completed quizzes.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.quiz-card-assigned',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Quiz Card</h3>
        <p className="text-gray-700 text-sm mb-1">
          Each card shows: title, subject, class, time limit, question count, and start date.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '.start-quiz-btn',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Start Quiz</h3>
        <p className="text-gray-700 text-sm">
          Click to begin your attempt. Make sure you have enough time!
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Ready to Start!</h2>
        <p className="text-gray-700 text-sm mb-2">
          You now know how to find and start your quizzes. Good luck!
        </p>
        <p className="text-xs text-gray-500">
          Tip: Check time limit before starting.
        </p>
      </div>
    ),
  },
];
