import React from 'react';
import { Package, CreditCard, QrCode, CheckCircle } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: Package,
      number: '01',
      title: 'Selecciona productos',
      description: 'Explora el menú de comidas, almuerzos, combos y papelería disponible hoy.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: CreditCard,
      number: '02',
      title: 'Paga o reserva',
      description: 'Elige tu método de pago: en línea, wallet o efectivo en mostrador.',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      icon: QrCode,
      number: '03',
      title: 'Recibe QR único',
      description: 'Obtén tu código QR personalizado para identificar tu pedido.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: CheckCircle,
      number: '04',
      title: 'Recoge sin filas',
      description: 'Presenta tu QR, valída tu identidad en 5 segundos. ¡Listo! Tu pedido.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 px-6 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Cómo funciona
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Un proceso simple de 4 pasos: selecciona, paga, recibe código y recoge
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-4 gap-6 relative">
          {/* Connection line - Hidden on mobile */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-cyan-400 to-green-400 z-0 animate-gradient-shift" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative z-10 animate-fade-in-up" style={{ animationDelay: `${index * 0.15}s`, opacity: 0 }}>
                {/* Step Card */}
                <div className="space-y-4">
                  {/* Icon Circle */}
                  <div className="flex items-center justify-center">
                    <div className={`${step.bgColor} p-6 rounded-full shadow-lg border-8 border-white relative`}>
                      <Icon className={`w-8 h-8 ${step.color}`} />
                    </div>
                  </div>

                  {/* Number Badge */}
                  <div className={`-mt-4 text-center`}>
                    <span className={`text-4xl font-bold ${step.color}`}>
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Arrow - Only between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex justify-center mt-8">
                    <div className="text-gray-400">→</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <button className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all">
            Comenzar ahora
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

