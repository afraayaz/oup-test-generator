import { Step } from 'react-joyride';

export const teacherCreateQuestionTourSteps: Step[] = [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div className="font-open-sans">
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Create Questions</h2>
        <p className="text-gray-700 text-sm">
          Learn how to create and manage questions for your quizzes.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.mode-selector',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Creation Modes</h3>
        <p className="text-gray-700 text-sm">
          Choose Individual or Bulk Upload for multiple questions.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.template-download-btn',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Download Template</h3>
        <p className="text-gray-700 text-sm">
          Download Excel template for bulk uploads.
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '.grade-select',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Select Class</h3>
        <p className="text-gray-700 text-sm">
          Pick class/grade level. Filters subjects and books.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.subject-select',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Select Subject</h3>
        <p className="text-gray-700 text-sm">
          Choose subject based on your assigned books.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.question-type-select',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Question Types</h3>
        <p className="text-gray-700 text-sm">
          MCQ, True/False, Short Answer, Long Answer, or Fill in the Blanks.
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.math-formula-btn',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Math Formula</h3>
        <p className="text-gray-700 text-sm">
          Insert mathematical expressions and symbols.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.urdu-keyboard-btn',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Urdu Keyboard</h3>
        <p className="text-gray-700 text-sm">
          Use on-screen Urdu keyboard for typing.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.preview-section',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Live Preview</h3>
        <p className="text-gray-700 text-sm">
          See real-time preview as you type.
        </p>
      </div>
    ),
    placement: 'left',
  },
  {
    target: '.submit-question-btn',
    content: (
      <div className="font-open-sans">
        <h3 className="text-base font-bold text-[#002147] mb-1 font-gibson">Submit Question</h3>
        <p className="text-gray-700 text-sm">
          Click to save your question to the database.
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
        <h2 className="text-xl font-bold text-[#002147] mb-2 font-gibson">Ready to Create!</h2>
        <p className="text-gray-700 text-sm mb-2">
          You now know how to create questions! Start building your question bank.
        </p>
        <p className="text-xs text-gray-500">
          Tip: Create diverse difficulty levels.
        </p>
      </div>
    ),
  },
];
