import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-yellow-400 text-white'
                    : isCurrent
                    ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200/60'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? <Check size={20} /> : index + 1}
              </div>
              <span
                className={`font-medium transition-all duration-300 ${
                  isCurrent ? 'text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                className={`w-16 h-1 rounded-full transition-all duration-300 ${
                  isCompleted ? 'bg-yellow-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
