import { Step } from 'react-joyride';

export const studentTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Welcome Student!</h2>
        <p className="text-gray-700 text-sm">
          Let's explore your dashboard together! This will only take a minute.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.stat-card-attempted',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Quizzes Attempted</h3>
        <p className="text-gray-700 text-sm">
          Track completed quizzes. Practice makes perfect!
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.stat-card-pending',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Pending Quizzes</h3>
        <p className="text-gray-700 text-sm">
          Quizzes waiting for you. Complete them before the deadline!
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.stat-card-latest',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Latest Score</h3>
        <p className="text-gray-700 text-sm">
          Your most recent quiz performance.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.stat-card-average',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Average Score</h3>
        <p className="text-gray-700 text-sm">
          Your overall average across all quizzes.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Ready to Learn!</h2>
        <p className="text-gray-700 text-sm mb-2">
          You're all set! Use the sidebar to view quizzes and track your progress.
        </p>
      </div>
    ),
  },
];
