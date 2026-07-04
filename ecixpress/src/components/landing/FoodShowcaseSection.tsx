import React, { useEffect, useRef, useState } from 'react';
import { Utensils } from 'lucide-react';
import FoodCarousel from '../ui/FoodCarousel';
import { mockStores } from '../../mock/stores';

const FOOD_IMAGES = mockStores.flatMap((store) => [
  store.imageUrl,
  ...store.products.map((product) => product.imageUrl),
]);

const FoodShowcaseSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-24 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
    >
      {/* Un solo glow decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-300/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div
          className="text-center mb-12 space-y-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 0.6s ease-out',
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
            <Utensils size={14} className="text-a11y-yellow-dark" />
            <span className="font-body text-sm font-semibold text-a11y-yellow-darker">
              Sabores del campus
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
            Todo lo que puedes pedir,{' '}
            <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h2>
          <p className="font-body text-lg text-gray-600 max-w-2xl mx-auto">
            Cafeterías, pastelerías y restaurantes reales del campus, listos para tu próximo pedido.
          </p>
        </div>

        {/* Carrusel decorativo */}
        <div
          className="relative max-w-7xl mx-auto h-72 sm:h-80 md:h-96 lg:h-[30rem] rounded-3xl overflow-hidden shadow-xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.97)',
            transition: 'all 0.7s ease-out 0.15s',
          }}
        >
          <FoodCarousel images={FOOD_IMAGES} />
        </div>
      </div>
    </section>
  );
};

export default FoodShowcaseSection;
