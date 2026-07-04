import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { useInViewReveal } from '../../hooks/useInViewReveal';
import { useCountUp } from '../../hooks/useCountUp';

const STATS: { target: number; decimals?: number; suffix: string; label: string }[] = [
  { target: 5000, suffix: '+', label: 'Usuarios activos' },
  { target: 15, suffix: '+', label: 'Universidades' },
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

/** Burbuja de testimonio: reproduce su propio fade-in al montar (reveal inicial y cada rotación de página). */
const TestimonialBubble: React.FC<{
  testimonial: { text: string; author: string; initial: string };
  delay: number;
  active: boolean;
}> = ({ testimonial, delay, active }) => {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!active) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  return (
    <div
      className="group relative p-6 rounded-3xl bg-white/60 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-2xl hover:bg-white/80 transition-all duration-500 overflow-hidden"
      style={{
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
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
  );
};

const SocialProofSection: React.FC = () => {
  const { ref: sectionRef, isVisible: visible } = useInViewReveal<HTMLDivElement>({ threshold: 0.2 });

  // Featured testimonial (estudiante principal)
  const featuredTestimonial = {
    name: 'Eliza Rodríguez',
    role: 'Estudiante de Ingeniería de Sistemas',
    university: 'Escuela Colombiana de Ingeniería Julio Garavito',
    image: '/FOTOELIZAFINAL.png',
    rating: 5,
    text: 'Con ECIXPRESS ahorro 30 minutos de filas cada día. Puedo concentrarme en mis proyectos y pasar más tiempo con mis amigos.',
  };

  // Testimonios secundarios (burbujas flotantes) — rotan automáticamente de a 3
  const floatingTestimonials = [
    {
      text: 'La app es tan fácil de usar que incluso mi abuela pudo hacer un pedido.',
      author: 'Carlos M.',
      initial: 'C',
    },
    {
      text: 'Antes hacía fila 30 minutos todos los días. Ahora pido desde el salón y listo.',
      author: 'Sofía L.',
      initial: 'S',
    },
    {
      text: 'El sistema QR es genial. Sin contacto, sin papeles. Perfecto para ahora.',
      author: 'Juan P.',
      initial: 'J',
    },
    {
      text: 'Recargo saldo desde el celular y pago en segundos en la cafetería.',
      author: 'Andrea T.',
      initial: 'A',
    },
    {
      text: 'Pedí el almuerzo entre clases y lo recogí sin hacer fila. Un antes y un después.',
      author: 'Miguel R.',
      initial: 'M',
    },
    {
      text: 'Me encanta poder ver en tiempo real cuándo mi pedido está listo.',
      author: 'Valentina G.',
      initial: 'V',
    },
  ];

  const TESTIMONIALS_PER_PAGE = 3;
  const pageCount = Math.ceil(floatingTestimonials.length / TESTIMONIALS_PER_PAGE);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || paused || pageCount <= 1) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pageCount), 6000);
    return () => clearInterval(id);
  }, [paused, pageCount]);

  const visibleTestimonials = floatingTestimonials.slice(
    page * TESTIMONIALS_PER_PAGE,
    page * TESTIMONIALS_PER_PAGE + TESTIMONIALS_PER_PAGE
  );

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

        {/* FLOATING TESTIMONIAL BUBBLES — rotan solas cada 6s, pausa en hover */}
        <div
          className="grid md:grid-cols-3 gap-6 mb-20"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {visibleTestimonials.map((testimonial, index) => (
            <TestimonialBubble
              key={`${page}-${index}`}
              testimonial={testimonial}
              delay={0.2 + index * 0.15}
              active={visible}
            />
          ))}
        </div>

        {/* Paginación decorativa de las burbujas */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 -mt-14 mb-20" aria-hidden="true">
            {Array.from({ length: pageCount }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === page ? 'w-6 bg-primary' : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
