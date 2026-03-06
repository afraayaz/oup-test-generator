import { Step } from 'react-joyride';

export const teacherCreateQuestionsTabTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Question Management</h2>
        <p className="text-gray-700 text-sm">
          Central hub for creating and managing questions.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.tab-navigation',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Navigation Tabs</h3>
        <p className="text-gray-700 text-sm">
          Create Questions (individual), Bulk Upload, or Question Bank (manage all).
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
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Ready to Create!</h2>
        <p className="text-gray-700 text-sm">
          Click any tab to explore. Each has its own detailed guide!
        </p>
      </div>
    ),
  },
];
