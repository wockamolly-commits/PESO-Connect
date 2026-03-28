import { CheckCircle } from 'lucide-react'

const STEP_LABELS = [
  'Account',
  'Personal',
  'Contact',
  'Education',
  'Skills',
  'Preferences',
  'Review'
]

function StepIndicator({ currentStep, totalSteps = 7 }) {
  return (
    <div className="mb-8">
      {/* Step circles with labels */}
      <div className="flex justify-between items-start mb-4">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep

          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${isCompleted ? 'bg-primary-600 text-white' : ''}
                  ${isCurrent ? 'bg-primary-500 text-white ring-4 ring-primary-100' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-gray-200 text-gray-500' : ''}
                `}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : step}
              </div>
              <span className={`
                mt-1 text-xs text-center hidden sm:block
                ${isCurrent ? 'text-primary-700 font-semibold' : 'text-gray-500'}
              `}>
                {STEP_LABELS[i]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        />
      </div>

      {/* Mobile step label */}
      <p className="mt-2 text-sm text-center text-gray-500 sm:hidden">
        Step {currentStep} of {totalSteps}: <span className="font-semibold text-primary-700">{STEP_LABELS[currentStep - 1]}</span>
      </p>
    </div>
  )
}

export { StepIndicator }
