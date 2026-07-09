import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { Zap, QrCode, Users, ShieldCheck, Bell, Sparkles } from 'lucide-react';

interface Benefit {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  {
    number: '01',
    icon: Zap,
    title: 'Rapidez real',
    description:
      'Pide en segundos desde clase y recibe una alerta en tiempo real cuando tu pedido esté listo.',
  },
  {
    number: '02',
    icon: QrCode,
    title: 'Cero filas',
    description:
      'Muestra tu código QR y recoge al instante. Tu pedido te espera a ti, no al revés.',
  },
  {
    number: '03',
    icon: Users,
    title: 'Hecho para la comunidad',
    description:
      'Creado por estudiantes de la Escuela para la vida real del campus: sus horarios, sus cafeterías y su ritmo.',
  },
  {
    number: '04',
    icon: ShieldCheck,
    title: 'Confianza total',
    description:
      'Pagos seguros, historial de pedidos y control de tus gastos en un solo lugar.',
  },
];

const DAILY_CHECKLIST = [
  'Pide desde clase',
  'Recoge en minutos',
  'Paga como quieras',
  'Todo desde el celular',
];

const CAMPUS_IMAGE = {
  src: '/campus-people.webp',
  alt: 'Estudiantes de la Escuela Colombiana de Ingeniería compartiendo en el campus',
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT, delay },
  }),
};

/** Fade-in + rise al entrar en viewport; se desactiva con prefers-reduced-motion. */
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      custom={delay}
      variants={revealVariants}
      initial={reduceMotion ? false : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-64px' }}
    >
      {children}
    </motion.div>
  );
};

const ImageCaption: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>
    <p className="font-display text-2xl md:text-4xl font-semibold text-white">
      La comunidad ECI, sin filas
    </p>
    <p className="font-body mt-2 max-w-md text-sm md:text-base text-white/80">
      Miles de estudiantes ya piden desde clase y recogen en minutos.
    </p>
  </div>
);

const ExpandingCampusImage: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const figureRef = useRef<HTMLElement>(null);

  // Sin sticky/pin: la imagen vive en el flujo normal y su transformación
  // sigue el recorrido de la propia sección por el viewport. Progreso 0
  // cuando empieza a asomar por abajo, 1 cuando termina de salir por arriba.
  const { scrollYProgress } = useScroll({
    target: figureRef,
    offset: ['start end', 'end start'],
  });

  // La expansión termina justo cuando la imagen queda completamente dentro
  // de la pantalla (progreso ≈ altura de la figura / distancia total del
  // recorrido), ni antes (se sentiría cortada) ni después (dejaría un
  // tramo muerto ya expandida). Un poco más lenta que una entrada rápida,
  // para que se sienta cinematográfica.
  const scale = useTransform(scrollYProgress, [0, 0.46], [0.78, 1]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.46], [40, 0]);
  const imageY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const captionOpacity = useTransform(scrollYProgress, [0.46, 0.62], [0, 1]);
  const captionY = useTransform(scrollYProgress, [0.46, 0.62], [24, 0]);
  const chipReadyY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const chipZeroY = useTransform(scrollYProgress, [0, 1], [20, -92]);

  // Versión estática y accesible: sin viaje de scroll ni parallax.
  if (reduceMotion) {
    return (
      <figure className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] shadow-2xl">
        <img
          src={CAMPUS_IMAGE.src}
          alt={CAMPUS_IMAGE.alt}
          className="h-[60vh] w-full object-cover md:h-[70vh]"
          loading="lazy"
          decoding="async"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-950/70 via-gray-950/10 to-transparent"
          aria-hidden="true"
        />
        <figcaption className="absolute inset-x-0 bottom-0 p-6 md:p-10">
          <ImageCaption />
        </figcaption>
      </figure>
    );
  }

  return (
    <motion.figure
      ref={figureRef}
      style={{ scale, borderRadius }}
      className="relative h-[64vh] w-full overflow-hidden bg-gray-950 shadow-[0_48px_120px_-24px_rgba(15,23,42,0.5)] will-change-transform sm:h-[74vh] md:h-[88vh]"
    >
      {/* Imagen con parallax interno sutil (sobredimensionada para no dejar bordes) */}
      <motion.img
        style={{ y: imageY }}
        src={CAMPUS_IMAGE.src}
        alt={CAMPUS_IMAGE.alt}
        className="absolute -top-[8%] left-0 h-[116%] w-full object-cover"
        loading="lazy"
        decoding="async"
      />

      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-gray-950/10 to-gray-950/10"
        aria-hidden="true"
      />

      <motion.div
        style={{ y: chipReadyY }}
        className="absolute right-4 top-10 md:right-12 md:top-16"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary shadow-md">
            <Bell className="h-4 w-4 text-white" />
          </span>
          <span className="font-body text-sm font-semibold text-white">
            Tu pedido está listo · 3 min
          </span>
        </div>
      </motion.div>

      <motion.div
        style={{ y: chipZeroY }}
        className="absolute left-4 top-1/3 md:left-14"
        aria-hidden="true"
      >
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 shadow-lg backdrop-blur-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary shadow-md">
            <QrCode className="h-4 w-4 text-white" />
          </span>
          <span className="font-body text-sm font-semibold text-white">
            Recoge con QR, sin filas
          </span>
        </div>
      </motion.div>

      <motion.figcaption
        style={{ opacity: captionOpacity, y: captionY }}
        className="absolute inset-x-0 bottom-0 p-6 md:p-12"
      >
        <ImageCaption />
      </motion.figcaption>
    </motion.figure>
  );
};

const BenefitRow: React.FC<{ benefit: Benefit; index: number }> = ({ benefit, index }) => {
  const Icon = benefit.icon;
  return (
    <Reveal delay={index * 0.08}>
      <div className="group flex items-start gap-5 py-8 transition-transform duration-500 md:gap-8 md:py-10 lg:hover:translate-x-2">
        <span
          className="font-display pt-1 text-sm font-semibold tracking-widest text-gray-400 transition-colors duration-300 group-hover:text-a11y-yellow-dark"
          aria-hidden="true"
        >
          {benefit.number}
        </span>
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-2xl bg-primary/40 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden="true"
          />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-md backdrop-blur-md transition-transform duration-500 group-hover:scale-110 group-hover:bg-white/90 md:h-14 md:w-14">
            <Icon className="h-5 w-5 text-a11y-yellow-dark md:h-6 md:w-6" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-display text-xl font-semibold text-gray-900 md:text-2xl">
            {benefit.title}
          </h3>
          <p className="font-body max-w-lg leading-relaxed text-gray-600">
            {benefit.description}
          </p>
        </div>
      </div>
    </Reveal>
  );
};

const EditorialBenefits: React.FC = () => (
  <div className="grid gap-14 lg:grid-cols-[5fr_7fr] lg:gap-24">
    <div className="self-start space-y-8 lg:sticky lg:top-28">
      <Reveal className="space-y-5">
        <span className="font-body text-lg font-semibold uppercase tracking-[0.2em] text-a11y-yellow-dark">
          Tu día en el campus
        </span>
        <h3 className="font-display text-3xl font-semibold leading-tight text-gray-900 md:text-5xl">
          Menos filas.
          <br />
          <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
            Más tiempo para ti.
          </span>
        </h3>
        <p className="font-body max-w-md text-lg leading-relaxed text-gray-600">
          ECIXPRESS convierte cada descanso entre clases en tiempo tuyo: pide desde el
          salón, paga desde el celular y recoge sin esperar.
        </p>
      </Reveal>

      <ul className="space-y-3">
        {DAILY_CHECKLIST.map((item, i) => (
          <Reveal key={item} delay={0.15 + i * 0.08}>
            <li className="group flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-primary transition-transform duration-300 group-hover:scale-150" />
              <span className="font-body text-gray-800 transition-colors duration-300 group-hover:text-a11y-yellow-dark">
                {item}
              </span>
            </li>
          </Reveal>
        ))}
      </ul>
    </div>

    {/* Columna de beneficios: ritmo editorial, sin cards genéricas */}
    <div className="divide-y divide-gray-200/80 border-t border-gray-200/80">
      {BENEFITS.map((benefit, index) => (
        <BenefitRow key={benefit.number} benefit={benefit} index={index} />
      ))}
    </div>
  </div>
);

const FeaturesSection: React.FC = () => (
  <section
    id="features"
    className="relative scroll-mt-28 overflow-hidden bg-white py-20 md:py-28"
  >
    <div
      className="pointer-events-none absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-yellow-300/10 blur-[140px]"
      aria-hidden="true"
    />

    <div className="relative mx-auto max-w-4xl px-6 text-center">
      <Reveal className="space-y-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/60 bg-yellow-100/80 px-4 py-2 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-a11y-yellow-dark" aria-hidden="true" />
          <span className="font-body text-sm font-semibold text-a11y-yellow-darker">
            Diseñado para el campus
          </span>
        </div>
        <h2 className="font-display flex items-center justify-center gap-3 text-4xl font-semibold text-gray-900 md:text-6xl">
          ¿Por qué{' '}
          <img
            src="/ecixpress-logo.svg"
            alt="ECIXPRESS"
            className="h-8 w-auto self-center md:h-11"
          />
          ?
        </h2>
        <p className="font-body mx-auto max-w-2xl text-xl text-gray-600">
          Diseñado para hacer tu experiencia en campus más rápida, cómoda y tuya.
        </p>
      </Reveal>
    </div>

    <div className="relative mt-8 md:mt-10">
      <ExpandingCampusImage />
    </div>

    <div className="relative mx-auto mt-10 max-w-7xl px-6 pb-4 md:mt-14">
      <EditorialBenefits />
    </div>
  </section>
);

export default FeaturesSection;
