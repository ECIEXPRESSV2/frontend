import React, { useEffect, useRef, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import FloatingShape from './FloatingShapes';

const SocialProofSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const testimonials = [
    {
      name: 'María González',
      role: 'Estudiante de Ingeniería',
      university: 'Universidad Central',
      image: '/student1.png',
      rating: 5,
      text: 'ECIXPRESS me ahorró horas de filas en la cafetería. Ahora puedo usar ese tiempo para estudiar o descansar entre clases.',
    },
    {
      name: 'Carlos Rodríguez',
      role: 'Estudiante de Medicina',
      university: 'Universidad Nacional',
      image: '/student2.png',
      rating: 5,
      text: 'La app es increíble. Pido mi comida mientras salgo de laboratorio y cuando llego ya está lista. Sin filas, sin estrés.',
    },
    {
      name: 'Ana Martínez',
      role: 'Estudiante de Arquitectura',
      university: 'Universidad Politécnica',
      image: '/student3.png',
      rating: 5,
      text: 'El sistema de QR es genial. Solo escaneo y recojo. Es la forma más eficiente de comprar en el campus.',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-6 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-yellow-50"
    >
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-yellow-200/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating shapes */}
      <FloatingShape
        type="circle"
        size={60}
        color="rgba(251, 191, 36, 0.25)"
        blur={15}
        position="top-right"
        animation="pulse"
        animationDuration="4s"
      />
      <FloatingShape
        type="diamond"
        size={40}
        color="rgba(251, 146, 60, 0.2)"
        position="bottom-left"
        animation="spin"
        animationDuration="18s"
      />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
            <div className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
            <span className="text-sm font-semibold text-a11y-yellow-darker">
              Lo que dicen los estudiantes
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight flex flex-col md:flex-row items-center justify-center gap-3">
            <span>Más de 5,000 estudiantes ya usan</span>
            <img
              src="/logotipoEcixpress.svg"
              alt="ECIXPRESS"
              className="h-8 md:h-9 w-auto self-center"
            />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Descubre por qué miles de estudiantes en universidades de todo el país han transformado su experiencia de compra en el campus.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative group p-8 rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-md shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `opacity 0.6s ease-out ${index * 0.15}s, transform 0.6s ease-out ${index * 0.15}s`,
              }}
            >
              {/* Quote icon */}
              <div className="absolute top-6 right-6 text-yellow-400/20">
                <Quote size={48} />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              {/* Testimonial text */}
              <p className="text-gray-700 leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Student info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-gray-500">{testimonial.university}</p>
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-orange-400/5 opacity-0 group-hover:opacity-100 transition duration-500" />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '5,000+', label: 'Usuarios activos' },
            { value: '15+', label: 'Universidades' },
            { value: '50K+', label: 'Pedidos' },
            { value: '4.9/5', label: 'Rating' },
          ].map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-xl bg-white/70 backdrop-blur-md border border-gray-200 hover:shadow-lg transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `opacity 0.6s ease-out ${0.3 + index * 0.1}s, transform 0.6s ease-out ${0.3 + index * 0.1}s`,
              }}
            >
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Accessibility: prefers-reduced-motion */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
};

export default SocialProofSection;
