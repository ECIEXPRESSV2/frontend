import React from 'react';
import { useInViewReveal } from '../../hooks/useInViewReveal';
import AnimatedTestimonials, { type Testimonial } from '../ui/animated-testimonials';

const SocialProofSection: React.FC = () => {
  const { ref: sectionRef, isVisible: visible } = useInViewReveal<HTMLDivElement>({ threshold: 0.2 });

  // Testimonio principal (estudiante con foto) + testimonios secundarios (solo cita y nombre).
  // AnimatedTestimonials deriva el avatar-inicial cuando no hay foto.
  const testimonials: Testimonial[] = [
    {
      quote:
        'Uso ECIXPRESS casi todos los días para pedir en el descanso entre clases. Ya no llego tarde a la siguiente por hacer fila en la cafetería.',
      name: 'Elizabeth Rodríguez',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/testimonial-elizabeth.png',
    },
    {
      quote:
        'Lo que más me sirve es poder pedir desde el salón y que me avise cuando ya está listo, así no me quedo esperando en el mostrador.',
      name: 'Marlio Jose Charry',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/testimonial-marlio.png',
    },
    {
      quote:
        'Antes coordinaba con mis compañeros quién hacía la fila. Ahora cada uno pide desde su celular y nos encontramos ya con la comida lista.',
      name: 'Sebastián Ortega',
      designation: 'Estudiante de Ingeniería de Sistemas · Escuela Colombiana de Ingeniería Julio Garavito',
      src: '/testimonial-sebastian.png',
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
            Así cambia el día a día en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-600">
              el campus
            </span>
          </h2>
          <p className="font-body text-base text-gray-600 max-w-2xl mx-auto">
            Historias reales de estudiantes que ya usan ECIXPRESS entre clases.
          </p>
        </div>

        {/* TESTIMONIOS - carrusel animado */}
        <div
          className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <AnimatedTestimonials testimonials={testimonials} autoplay />
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
