import React from 'react';

const STEP_LABELS = [
  'Account',
  'Personal Info',
  'Address & Contact',
  'Employment',
  'Job Preference',
  'Education & Language',
  'Skills & Qualifications',
  'Consent'
];

export default function ProgressBar({ currentStep, totalSteps = 8 }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const label = STEP_LABELS[currentStep - 1] || '';

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          {label}
        </span>
        <span className="text-xs text-gray-400">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
          }}
        />
      </div>
    </div>
  );
}
