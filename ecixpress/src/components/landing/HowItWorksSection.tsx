import React from 'react';
import { Package, CreditCard, QrCode, CheckCircle } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: Package,
      number: '01',
      title: 'Selecciona productos',
      description: 'Explora el menú disponible y elige fácilmente.',
      gradient: 'from-yellow-400 to-yellow-600',
    },
    {
      icon: CreditCard,
      number: '02',
      title: 'Paga o reserva',
      description: 'Elige tu método de pago preferido.',
      gradient: 'from-cyan-400 to-blue-600',
    },
    {
      icon: QrCode,
      number: '03',
      title: 'Recibe tu QR',
      description: 'Obtén tu código único al instante.',
      gradient: 'from-blue-400 to-indigo-600',
    },
    {
      icon: CheckCircle,
      number: '04',
      title: 'Recoge sin filas',
      description: 'Presenta tu QR y recibe tu pedido.',
      gradient: 'from-green-400 to-emerald-600',
    },
  ];

  return (
      <section className="relative py-24 px-6 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">

        {/* glow fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-300/10 blur-[160px] rounded-full" />

        <div className="relative max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="text-center space-y-4 mb-24">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Cómo funciona
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Un flujo simple, rápido y sin fricción
            </p>
          </div>

          {/* CONTAINER */}
          <div className="relative">

            {/* ✅ LÍNEA BASE (apagada) */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-[2px] bg-gray-200 z-0" />

            {/* ✅ LÍNEA PROGRESO ANIMADA */}
            <div className="hidden md:block absolute top-1/2 left-0 h-[2px] z-10
            bg-gradient-to-r from-yellow-400 via-cyan-400 to-green-400
            animate-progress-line"
            />

            {/* GRID */}
            <div className="grid md:grid-cols-4 gap-8 relative z-20">

              {steps.map((step, index) => {
                const Icon = step.icon;

                return (
                    <div key={index} className="relative group">

                      {/* CARD */}
                      <div
                          className="relative p-6 rounded-2xl border border-gray-200
                    bg-white/40 backdrop-blur-md
                    shadow-lg shadow-gray-200/50
                    hover:shadow-2xl hover:shadow-yellow-200/40
                    hover:-translate-y-2 transition-all duration-500"
                      >

                        {/* glow */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition duration-500 
                      bg-gradient-to-br ${step.gradient} blur-xl`} />

                        <div className="relative z-10 space-y-4 text-center">

                          {/* ICON */}
                          <div className="flex justify-center">
                            <div
                                className={`w-14 h-14 rounded-xl flex items-center justify-center
                          bg-white/70 backdrop-blur border border-white/50 shadow-md
                          group-hover:scale-110 group-hover:shadow-lg transition`}
                            >
                              <Icon className="w-6 h-6 text-gray-800" />
                            </div>
                          </div>

                          {/* NUMBER */}
                          <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full
                        bg-gradient-to-r ${step.gradient} text-white shadow-sm`}
                          >
                        Paso {step.number}
                      </span>

                          {/* TITLE */}
                          <h3 className="text-lg font-bold text-gray-900">
                            {step.title}
                          </h3>

                          <p className="text-sm text-gray-600">
                            {step.description}
                          </p>

                        </div>
                      </div>

                    </div>
                );
              })}

            </div>
          </div>

          {/* CTA */}
          <div className="mt-24 text-center">
            <button
                className="relative px-10 py-4 rounded-xl font-semibold text-white
            bg-gradient-to-r from-yellow-400 to-yellow-500
            shadow-lg hover:shadow-yellow-300/50
            hover:scale-105 transition-all duration-300 group overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
              Comenzar ahora
            </button>
          </div>

        </div>

        {/* ✅ KEYFRAMES */}
        <style>
          {`
          @keyframes progressLine {
            0% { width: 0%; opacity: 0.3; }
            50% { opacity: 1; }
            100% { width: 100%; opacity: 0.8; }
          }

          .animate-progress-line {
            animation: progressLine 2s ease-out forwards;
          }
        `}
        </style>

      </section>
  );
};

export default HowItWorksSection;