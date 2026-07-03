
import React, { useEffect, useRef, useState } from 'react';
import { Package, CreditCard, QrCode, CheckCircle } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      icon: Package,
      number: '01',
      title: 'Selecciona productos',
      description: 'Explora el menú disponible y elige fácilmente.',
      gradient: 'from-primary to-amber-600',
      image: '/UPIMG.JPG',
    },
    {
      icon: CreditCard,
      number: '02',
      title: 'Paga o reserva',
      description: 'Elige tu método de pago preferido.',
      gradient: 'from-secondary to-blue-600',
      image: '/EDIFICIO-E-ESCUELA.JPG',
    },
    {
      icon: QrCode,
      number: '03',
      title: 'Recibe tu QR',
      description: 'Obtén tu código único al instante.',
      gradient: 'from-secondary to-blue-600',
      image: '/QRIMG2.jpg',
    },
    {
      icon: CheckCircle,
      number: '04',
      title: 'Recoge sin filas',
      description: 'Presenta tu QR y recibe tu pedido.',
      gradient: 'from-emerald-400 to-emerald-600',
      image: '/FILAIMG.JPG',
    },
  ];

  return (
    <section ref={sectionRef} id="how-it-works" className="relative py-20 md:py-28 px-6 bg-white overflow-hidden scroll-mt-28">

      {/* FLOATING SHAPES - Decorative Elements */}
      <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-yellow-300/30 blur-2xl pointer-events-none animate-float"
           style={{ animationDelay: '0s' }}
      />
      <div className="absolute -top-40 right-10 w-96 h-96 rounded-full bg-cyan-300/30 blur-2xl pointer-events-none animate-float"
           style={{ animationDelay: '2s' }}
      />
      <div className="absolute bottom-0 -left-40 w-80 h-80 rounded-full bg-blue-300/25 blur-2xl pointer-events-none animate-float"
           style={{ animationDelay: '4s' }}
      />
      <div className="absolute bottom-10 -right-32 w-72 h-72 rounded-full bg-emerald-300/25 blur-2xl pointer-events-none animate-float"
           style={{ animationDelay: '1s' }}
      />

      <div className="relative max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="space-y-3 mb-20">
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 tracking-tight">
            Cómo funciona
          </h2>
          <p className="font-body text-xl text-gray-600 max-w-xl">
            Un flujo simple, rápido y sin fricción
          </p>
        </div>

        {/* CONTAINER - 2 COLUMN LAYOUT */}
        <div className="grid md:grid-cols-2 gap-16 items-start relative">
          {/* LEFT COLUMN - TIMELINE */}
          <div className="relative hidden md:block">
            {/* Timeline Line */}
            <div className="absolute left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-cyan-400 to-emerald-400 rounded-full"
                 style={{
                   opacity: isVisible ? 1 : 0.3,
                   transition: 'opacity 0.6s ease-out'
                 }}
            />

            {/* Steps - LEFT */}
            <div className="space-y-16 pr-32">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    className="group relative text-right"
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                      transition: `all 0.6s ease-out ${index * 0.1}s`,
                    }}
                  >
                    {/* Timeline dot - Animated */}
                    <div className="timeline-dot absolute -right-[98px] top-0 w-8 h-8 bg-white border-4 border-gray-900 rounded-full shadow-lg z-10 group-hover:scale-125 group-hover:shadow-xl transition-all duration-300" />

                    {/* Number - BIG */}
                    <div className="font-display text-7xl font-semibold text-gray-900 leading-none mb-6 group-hover:scale-105 transition-all duration-300 cursor-pointer relative z-20"
                         style={{ transformOrigin: 'right bottom' }}
                    >
                      {step.number}
                    </div>

                    {/* Small icon + hint - LARGER */}
                    <div className="flex items-center justify-end gap-4 mb-5 relative z-20">
                      <span className="font-body text-base font-bold text-gray-900 uppercase tracking-widest group-hover:text-a11y-yellow-dark transition-colors duration-300">
                        Paso {step.number}
                      </span>
                      <div className="w-10 h-10 text-gray-700 group-hover:scale-125 transition-transform duration-300">
                        <Icon size={40} strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-display text-2xl font-semibold text-gray-900 leading-tight mb-3 group-hover:text-a11y-yellow-dark transition-colors duration-300">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="font-body text-base text-gray-700 leading-relaxed max-w-sm group-hover:text-gray-900 transition-colors duration-300 ml-auto">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN - Visual decoration with Stock Images */}
          <div className="relative hidden md:block">
            {/* Cards with Stock Images - Decorative */}
            <div className="space-y-12 mt-20">
              {steps.map((step, index) => {
                return (
                  <div
                    key={index}
                    className="group h-48 rounded-2xl overflow-hidden relative transition-all duration-500 hover:shadow-2xl hover:scale-105 hover:-translate-y-2 cursor-pointer"
                    style={{
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? 'translateX(0)' : 'translateX(40px)',
                      transition: `all 0.6s ease-out ${index * 0.1}s`,
                    }}
                  >
                    {/* Background Image */}
                    <img
                      src={step.image}
                      alt={step.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />

                    {/* Overlay oscuro para contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/50 transition-all duration-300" />

                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500
                      bg-gradient-to-br ${step.gradient}`} />

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-white/40 transition-all duration-300">
                        <step.icon size={24} className="text-white" strokeWidth={1.5} />
                      </div>
                      <p className="font-body text-white font-semibold text-base group-hover:text-white transition-colors duration-300">
                        {step.title}
                      </p>
                      <p className="font-body text-white/80 text-sm mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE LAYOUT - Stacked */}
          <div className="md:hidden space-y-12 col-span-full">
            {/* Timeline Line - Mobile */}
            <div className="absolute left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 via-cyan-400 to-emerald-400 h-full" />

            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative pl-20">
                  {/* Timeline dot - Mobile */}
                  <div className="absolute -left-3 top-1 w-6 h-6 bg-white border-3 border-gray-900 rounded-full shadow-lg z-10" />

                  {/* Number - Mobile */}
                  <div className="font-display text-5xl font-semibold text-gray-900 mb-2">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className="w-5 h-5 text-gray-700 mb-2">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="font-body text-base text-gray-700">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ANIMATIONS */}
      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes dotPulse {
            0%, 100% {
              box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.4);
            }
            50% {
              box-shadow: 0 0 0 8px rgba(250, 204, 21, 0);
            }
          }

          .timeline-dot {
            animation: dotPulse 2.5s infinite;
          }

          .animate-float {
            animation: float 8s ease-in-out infinite;
          }
        `}
      </style>
    </section>
  );
};

export default HowItWorksSection;
