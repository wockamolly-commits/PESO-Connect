import { CheckCircle } from 'lucide-react'

const StepIndicator = ({ currentStep, totalSteps }) => {
    return (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
                {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div
                        key={step}
                        className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                            step < currentStep
                                ? 'bg-primary-600 text-white'
                                : step === currentStep
                                ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                                : 'bg-gray-200 text-gray-500'
                        }`}
                    >
                        {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                    </div>
                ))}
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
            </div>
        </div>
    )
}

export { StepIndicator }
export default StepIndicator
