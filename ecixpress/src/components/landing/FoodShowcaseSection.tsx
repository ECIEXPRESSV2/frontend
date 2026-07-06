import React from 'react';
import { Utensils } from 'lucide-react';
import FoodCarousel from '../ui/FoodCarousel';
import { mockStores } from '../../mock/stores';
import { STATIONERY_IMAGES } from '../../mock/stationeryImages';
import { useInViewReveal } from '../../hooks/useInViewReveal';

const FOOD_IMAGES = mockStores.flatMap((store) => [
  store.imageUrl,
  ...store.products.map((product) => product.imageUrl),
]);

const SHOWCASE_IMAGES = [...FOOD_IMAGES, ...STATIONERY_IMAGES];

const FoodShowcaseSection: React.FC = () => {
  const { ref: sectionRef, isVisible: visible } = useInViewReveal<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-24 px-6 overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-300/15 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
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
              Comida y papelería del campus
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
            Todo lo que puedes pedir,{' '}
            <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h2>
          <p className="font-body text-lg text-gray-600 max-w-2xl mx-auto">
            Cafeterías, pastelerías, restaurantes y papelerías reales del campus, listos para tu próximo pedido.
          </p>
        </div>

        <div
          className="relative max-w-7xl mx-auto h-96 sm:h-[28rem] md:h-[36rem] lg:h-[42rem] rounded-3xl overflow-hidden shadow-xl"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1)' : 'scale(0.97)',
            transition: 'all 0.7s ease-out 0.15s',
          }}
        >
          <FoodCarousel images={SHOWCASE_IMAGES} />
        </div>
      </div>
    </section>
  );
};

export default FoodShowcaseSection;
