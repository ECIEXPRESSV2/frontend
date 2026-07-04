import React from 'react';
import { useInViewReveal } from '../../hooks/useInViewReveal';
import { useCountUp } from '../../hooks/useCountUp';
import AnimatedTestimonials, { type Testimonial } from '../ui/animated-testimonials';

const STATS: { target: number; decimals?: number; suffix: string; label: string }[] = [
  { target: 5000, suffix: '+', label: 'Usuarios activos' },
  { target: 150, suffix: 'K+', label: 'Pedidos completados' },
  { target: 4.9, decimals: 1, suffix: '/5', label: 'Satisfacción' },
];

/** Número animado con fallback accesible: el valor final se anuncia de inmediato via sr-only. */
const StatCounter: React.FC<{
  target: number;
  decimals?: number;
  suffix: string;
  isActive: boolean;
  delay: number;
}> = ({ target, decimals = 0, suffix, isActive, delay }) => {
  const value = useCountUp({ target, isActive, duration: 1800 + delay * 150 });
  const formatted = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('en-US');
  const finalFormatted = decimals ? target.toFixed(decimals) : Math.round(target).toLocaleString('en-US');
  return (
    <>
      <span aria-hidden="true">{formatted}{suffix}</span>
      <span className="sr-only">{finalFormatted}{suffix}</span>
    </>
  );
};

const SocialProofSection: React.FC = () => {
  const { ref: sectionRef, isVisible: visible } = useInViewReveal<HTMLDivElement>({ threshold: 0.2 });

  // Testimonio principal (estudiante con foto) + testimonios secundarios (solo cita y nombre).
  // Mismos datos que antes; AnimatedTestimonials deriva el avatar-inicial cuando no hay foto.
  const testimonials: Testimonial[] = [
    {
      quote:
        'Con ECIXPRESS ahorro 30 minutos de filas cada día. Puedo concentrarme en mis proyectos y pasar más tiempo con mis amigos.',
      name: 'Elizabeth Rodríguez',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/FOTOELIZAFINAL.png',
    },
    {
      quote: 'La app es tan fácil de usar que incluso mi abuela pudo hacer un pedido.',
      name: 'Marlio Jose Charry',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/FOTOSINFONDOMAR.png',
    },
    {
      quote: 'Antes hacía fila 30 minutos todos los días. Ahora pido desde el salón y listo.',
      name: 'Sebastián Ortega',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/FOTOSINFONDOSEBASTIAN.png',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
    >
      {/* Un solo glow decorativo */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-300/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100/80 border border-yellow-300/60 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-body text-sm font-semibold text-a11y-yellow-darker">
              Lo que dicen los estudiantes
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
            Confían en nosotros más de <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">5,000 estudiantes</span>
          </h2>
          <p className="font-body text-base text-gray-600 max-w-2xl mx-auto">
            Descubre cómo ECIXPRESS simplifica la vida diaria en el campus.
          </p>
        </div>

        {/* TESTIMONIOS - carrusel animado (reemplaza el testimonio destacado + burbujas) */}
        <div
          className="relative mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <AnimatedTestimonials testimonials={testimonials} autoplay />
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 text-center hover:bg-white/90 hover:shadow-lg transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.9)',
                transition: `all 0.6s ease-out ${0.4 + index * 0.1}s`,
              }}
            >
              <p className="font-display text-3xl md:text-4xl font-semibold bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                <StatCounter
                  target={stat.target}
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                  isActive={visible}
                  delay={index}
                />
              </p>
              <p className="font-body text-sm text-gray-600 mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
