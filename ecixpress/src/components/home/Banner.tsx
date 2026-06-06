import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerData {
  title: string;
  subtitle: string;
  imageUrl: string;
  gradient: string;
}

const banners: BannerData[] = [
  {
    title: 'BIENVENIDOS A ECIXPRESS',
    subtitle: 'Tu comida favorita, un clic de distancia',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop',
    gradient: 'from-yellow-400 to-yellow-500'
  },
  {
    title: 'OFERTAS ESPECIALES',
    subtitle: 'Descubre los mejores descuentos del día',
    imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop',
    gradient: 'from-orange-400 to-red-500'
  },
  {
    title: 'ENTREGA RÁPIDA',
    subtitle: 'Tu pedido en menos de 30 minutos',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop',
    gradient: 'from-green-400 to-teal-500'
  }
];

const Banner: React.FC = () => {
  const [currentBanner, setCurrentBanner] = useState(0);

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      nextBanner();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const banner = banners[currentBanner];

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r shadow-lg shadow-yellow-200/60">
      {/* Background Image with Overlay */}
      <div 
        className={`absolute inset-0 bg-cover bg-center opacity-20 transition-all duration-700 ease-in-out`}
        style={{ 
          backgroundImage: `url(${banner.imageUrl})`,
          background: `linear-gradient(to right, ${banner.gradient})`
        }}
      />
      
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${banner.gradient} transition-all duration-700 ease-in-out`} />
      
      {/* Decorative Shapes */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Content */}
      <div className="relative z-10 p-8 md:p-18 px-16">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 animate-fade-in-up">
          {banner.title}
        </h1>
        <p className="text-white/90 text-lg md:text-xl mb-6 animate-fade-in-up-delay-1">
          {banner.subtitle}
        </p>
        <button className="px-6 py-3 bg-white text-yellow-600 font-semibold rounded-xl hover:bg-yellow-50 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 animate-fade-in-up-delay-2">
          Explorar ahora
        </button>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          prevBanner();
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          nextBanner();
        }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300 hover:scale-110 z-20"
      >
        <ChevronRight size={20} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentBanner(index);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              currentBanner === index 
                ? 'bg-white w-6' 
                : 'bg-white/50 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Banner;
