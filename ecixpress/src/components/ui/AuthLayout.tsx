import React from 'react';
import FoodCarousel from './FoodCarousel';

interface AuthLayoutProps {
  children: React.ReactNode;
  carouselPosition?: 'left' | 'right';
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  carouselPosition = 'left' 
}) => {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-yellow-50 via-white to-yellow-100">
      {/* Carrusel */}
      <div className={`relative hidden md:flex md:w-7/12 h-screen overflow-hidden bg-gradient-to-br from-white via-yellow-50 ${
        carouselPosition === 'right' ? 'order-2' : ''
      }`}>
        {/* Fondo glass */}
        <div className="absolute inset-0 backdrop-blur-xl bg-white/10"></div>
        
        {/* Carrusel */}
        <div className="relative w-full h-full">
          <FoodCarousel />
        </div>
      </div>

      {/* Panel derecho */}
      <div className="w-full md:w-5/12 flex items-center justify-center p-6 md:p-12
                    bg-white/40 backdrop-blur-2xl border-l border-white/30">
        <div className="w-full max-w-sm space-y-6
                      bg-white/50 backdrop-blur-xl
                      border border-white/40
                      shadow-[0_8px_32px_rgba(0,0,0,0.08)]
                      rounded-2xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
