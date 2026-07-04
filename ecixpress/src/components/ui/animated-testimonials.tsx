import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export interface Testimonial {
  quote: string;
  name: string;
  /** Rol/afiliación opcional; se omite cuando el testimonio no lo especifica. */
  designation?: string;
  /** Foto opcional; sin ella se muestra un avatar con la inicial del nombre. */
  src?: string;
}

interface AnimatedTestimonialsProps {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
}

/** Rotación aleatoria leve para el efecto de pila de fotos superpuestas. */
const randomTilt = () => Math.floor(Math.random() * 21) - 10;

const AnimatedTestimonials = ({ testimonials, autoplay = false, className }: AnimatedTestimonialsProps) => {
  const [active, setActive] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  const handleNext = () => setActive((prev) => (prev + 1) % testimonials.length);
  const handlePrev = () => setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  const isActive = (index: number) => index === active;

  useEffect(() => {
    if (!autoplay || prefersReducedMotion) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, prefersReducedMotion, testimonials.length]);

  const activeTestimonial = testimonials[active];

  return (
    <div
      className={cn('max-w-sm md:max-w-4xl mx-auto px-4 md:px-8 lg:px-12', className)}
      role="group"
      aria-roledescription="carousel"
      aria-label="Testimonios de estudiantes"
    >
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-20">
        <div className="relative h-96 md:h-[32rem] w-full" aria-hidden="true">
          <AnimatePresence>
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, scale: 0.9, rotate: randomTilt() }}
                animate={{
                  opacity: isActive(index) ? 1 : 0.7,
                  scale: isActive(index) ? 1 : 0.95,
                  rotate: isActive(index) ? 0 : randomTilt(),
                  zIndex: isActive(index) ? 999 : testimonials.length + 2 - index,
                  y: prefersReducedMotion ? 0 : isActive(index) ? [0, -80, 0] : 0,
                }}
                exit={{ opacity: 0, scale: 0.9, rotate: randomTilt() }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="absolute inset-0 origin-bottom"
              >
                {testimonial.src ? (
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0 rounded-3xl border border-white/40 shadow-lg bg-gradient-to-br from-yellow-50 to-white" />
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      draggable={false}
                      className="absolute left-1/2 bottom-0 -translate-x-1/2 h-[115%] w-auto max-w-none rounded-b-3xl object-contain drop-shadow-xl"
                    />
                  </div>
                ) : (
                  <div className="relative h-full w-full rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-200/50 to-amber-200/30 backdrop-blur-xl border border-white/50 ring-1 ring-white/20 shadow-lg flex items-center justify-center">
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" aria-hidden="true" />
                    <span className="font-display text-7xl font-semibold text-a11y-yellow-darker">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex justify-between flex-col py-4">
          <motion.div
            key={active}
            initial={{ y: prefersReducedMotion ? 0 : 20, opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: prefersReducedMotion ? 0 : -20, opacity: prefersReducedMotion ? 1 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            aria-live="polite"
          >
            <h3 className="font-display text-2xl font-semibold text-gray-900">{activeTestimonial.name}</h3>
            {activeTestimonial.designation && (
              <p className="font-body text-sm text-a11y-yellow-dark font-semibold mt-1">
                {activeTestimonial.designation}
              </p>
            )}
            <p className="font-body text-lg text-gray-600 mt-8">
              {activeTestimonial.quote.split(' ').map((word, index) => (
                <motion.span
                  key={index}
                  initial={{
                    filter: prefersReducedMotion ? 'blur(0px)' : 'blur(10px)',
                    opacity: prefersReducedMotion ? 1 : 0,
                    y: prefersReducedMotion ? 0 : 5,
                  }}
                  animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeInOut',
                    delay: prefersReducedMotion ? 0 : 0.02 * index,
                  }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </p>
          </motion.div>

          <div className="flex gap-4 pt-12 md:pt-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Testimonio anterior"
              className="h-9 w-9 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-md flex items-center justify-center group/button hover:bg-white/90 hover:shadow-lg transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 text-gray-900 group-hover/button:-translate-x-0.5 transition-transform duration-300" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Siguiente testimonio"
              className="h-9 w-9 rounded-full bg-white/70 backdrop-blur-md border border-white/40 shadow-md flex items-center justify-center group/button hover:bg-white/90 hover:shadow-lg transition-all duration-300"
            >
              <ArrowRight className="h-4 w-4 text-gray-900 group-hover/button:translate-x-0.5 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedTestimonials;
