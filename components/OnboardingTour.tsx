'use client';

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface OnboardingTourProps {
  steps: Step[];
  storageKey: string;
  run?: boolean;
}

export default function OnboardingTour({ steps, storageKey, run = true }: OnboardingTourProps) {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Check if user has already seen the tour
    const hasSeenTour = localStorage.getItem(storageKey);
    if (!hasSeenTour && run) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setRunTour(true);
      }, 1000);
    }
  }, [storageKey, run]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      // Mark tour as completed
      localStorage.setItem(storageKey, 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          arrowColor: '#fff',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: '#002147',
          textColor: '#333',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          padding: 12,
          maxWidth: 360,
        },
        tooltipContent: {
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#002147',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: '600',
        },
        buttonBack: {
          color: '#002147',
          marginRight: 8,
          fontSize: '13px',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '13px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
}
