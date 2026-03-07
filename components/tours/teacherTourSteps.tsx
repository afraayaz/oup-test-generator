import { Step } from 'react-joyride';

export const teacherTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Welcome Teacher!</h2>
        <p className="text-gray-700 text-sm">
          Let's take a quick tour of your dashboard. This will only take a minute!
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.stat-card-books',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Assigned Books</h3>
        <p className="text-gray-700 text-sm">
          Total books assigned to you for creating questions and quizzes.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.stat-card-questions',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Questions Created</h3>
        <p className="text-gray-700 text-sm">
          Track your created questions. Build your question bank!
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.stat-card-quizzes',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Quizzes Created</h3>
        <p className="text-gray-700 text-sm">
          Total quizzes you've created for students.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.assigned-books-section',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Your Assigned Books</h3>
        <p className="text-gray-700 text-sm">
          Browse all assigned books. Click any book to explore chapters.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableScrolling: true,
  },
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">You're All Set!</h2>
        <p className="text-gray-700 text-sm mb-2">
          You now know the basics! Use the sidebar to create questions and generate quizzes.
        </p>
      </div>
    ),
  },
];
