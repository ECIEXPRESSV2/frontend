import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
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

  // Featured testimonial (estudiante principal)
  const featuredTestimonial = {
    name: 'Eliza Rodríguez',
    role: 'Estudiante de Ingeniería de Sistemas',
    university: 'Escuela Colombiana de Ingeniería Julio Garavito',
    image: '/FOTOELIZAFINAL.png',
    rating: 5,
    text: 'Con ECIXPRESS ahorro 30 minutos de filas cada día. Puedo concentrarme en mis proyectos y pasar más tiempo con mis amigos.',
  };

  // Testimonios secundarios (burbujas flotantes)
  const floatingTestimonials = [
    {
      text: 'La app es tan fácil de usar que incluso mi abuela pudo hacer un pedido.',
      author: 'Carlos M.',
      initial: 'C',
    },
    {
      text: 'He ahorrado 30 min de tiempo en filas cada semana. ¡Eso es increíble!',
      author: 'Sofía L.',
      initial: 'S',
    },
    {
      text: 'El sistema QR es genial. Sin contacto, sin papeles. Perfecto para ahora.',
      author: 'Juan P.',
      initial: 'J',
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-32 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
    >
      {/* Decorative glow - Background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-yellow-300/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-cyan-300/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Floating shapes */}
      <FloatingShape
        type="circle"
        size={50}
        color="rgba(251, 191, 36, 0.2)"
        blur={12}
        position="top-left"
        animation="pulse"
        animationDuration="5s"
      />
      <FloatingShape
        type="diamond"
        size={35}
        color="rgba(34, 211, 238, 0.15)"
        position="bottom-right"
        animation="spin"
        animationDuration="20s"
      />

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

        {/* FEATURED TESTIMONIAL - Premium Layout */}
        <div
          className="relative mb-20"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {/* Main card - Glassmorphism */}
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Text & Stats */}
            <div className="space-y-8">
              {/* Quote highlight */}
              <div className="space-y-6">
                <div className="flex gap-1">
                  {[...Array(featuredTestimonial.rating)].map((_, i) => (
                    <Star key={i} size={18} className="fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="font-body text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
                  "{featuredTestimonial.text}"
                </p>
              </div>

              {/* Student info */}
              <div className="flex flex-col">
                <p className="font-display text-xl font-semibold text-gray-900">{featuredTestimonial.name}</p>
                <p className="font-body text-base text-a11y-yellow-dark font-semibold">{featuredTestimonial.role}</p>
                <p className="font-body text-sm text-gray-500 mt-1">{featuredTestimonial.university}</p>
              </div>
            </div>

            {/* Right side - Student Image (Protagonist) */}
            <div className="relative h-[350px] md:h-[450px] flex items-center justify-center">
              {/* Glasmorphism background container - Moderno */}
              <div className="absolute inset-0 rounded-2xl md:rounded-3xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/30 shadow-lg" />

              {/* Glow effect */}
              <div className="absolute -inset-6 bg-gradient-to-br from-yellow-300/12 to-orange-300/8 blur-3xl rounded-full" />

              {/* Student PNG */}
              <div className="relative z-10 h-full w-full flex items-center justify-center overflow-hidden rounded-2xl md:rounded-3xl">
                <img
                  src={featuredTestimonial.image}
                  alt={featuredTestimonial.name}
                  className="h-full w-auto object-contain hover:scale-105 transition-transform duration-500"
                  style={{
                    filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.1))',
                  }}
                />
              </div>

              {/* Floating badge - Modern */}
              <div
                className="absolute bottom-4 left-4 z-20 bg-white/75 backdrop-blur-md rounded-xl p-3 shadow-md border border-white/60"
                style={{
                  animation: 'float 3s ease-in-out infinite',
                  animationDelay: '0.5s',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-gray-900">4.9</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FLOATING TESTIMONIAL BUBBLES */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {floatingTestimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-2xl hover:bg-white/80 transition-all duration-500 overflow-hidden"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: `all 0.6s ease-out ${0.2 + index * 0.15}s`,
              }}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 rounded-3xl" />

              {/* Content */}
              <div className="relative z-10 space-y-4">
                <p className="font-body text-gray-700 font-medium italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center text-white font-display font-semibold text-sm">
                    {testimonial.initial}
                  </div>
                  <p className="font-body text-sm font-semibold text-gray-900">{testimonial.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* STATISTICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '5,000+', label: 'Usuarios activos' },
            { value: '15+', label: 'Universidades' },
            { value: '150K+', label: 'Pedidos completados' },
            { value: '4.9/5', label: 'Satisfacción' },
          ].map((stat, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/40 text-center hover:bg-white/90 hover:shadow-lg transition-all duration-300"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.9)',
                transition: `all 0.6s ease-out ${0.4 + index * 0.1}s`,
              }}
            >
              <p className="font-display text-3xl md:text-4xl font-semibold bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="font-body text-sm text-gray-600 mt-2">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes slideInScale {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default SocialProofSection;
