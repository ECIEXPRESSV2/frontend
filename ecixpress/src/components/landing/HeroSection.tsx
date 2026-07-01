import React from 'react';
import { ArrowRight } from 'lucide-react';
import FloatingShape from './FloatingShapes';

interface HeroProps {
  onGetStartedClick?: () => void;
  onSignInClick?: () => void;
}

const HeroSection: React.FC<HeroProps> = ({ onGetStartedClick, onSignInClick }) => {
  return (
    <section className="min-h-screen w-full
        bg-[linear-gradient(270deg,#ffffff,#fef3c7,#fde68a,#ffffff)]
        bg-[length:400%_400%]
        animate-gradient
         flex items-center justify-center pt-20 pb-12 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300 animate-bounce-slow">
              <div className="w-2 h-2 rounded-full bg-yellow-600 animate-pulse" />
              <span className="text-sm font-semibold text-a11y-yellow-darker">Pide. Llega. Recoge.</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-5">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight animate-slide-up">
                Compra en el campus{' '}
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent animate-gradient-shift">
                  sin hacer filas
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-xl animate-slide-up-delay-1">
                Pide comida, papelería y mucho más. Recoge sin esperas. Paga en línea o en sitio.
                La forma inteligente de comprar en la universidad.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-slide-up-delay-2">
              <button
                onClick={onGetStartedClick}
                className="px-8 py-4 rounded-xl font-semibold text-gray-900 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 group hover:shadow-yellow-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
              >
                Comenzar ahora
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onSignInClick}
                className="px-8 py-4 rounded-xl font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
              >
                Iniciar sesión
              </button>
            </div>

            {/* Trust Indicators */}

          </div>

          {/* Right Visual - iPhone Mockup */}
          <div className="relative h-full min-h-[650px] hidden md:flex items-center justify-center">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-100 rounded-full opacity-30 blur-3xl animate-float" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100 rounded-full opacity-20 blur-3xl animate-float-delay" />

            {/* Floating shapes - reduced for better hierarchy */}
            <FloatingShape
                type="circle"
                size={80}
                color="rgba(251, 191, 36, 0.35)"
                blur={20}
                position="top-right"
                animation="pulse"
                animationDuration="3s"
            />
            <FloatingShape
                type="diamond"
                size={50}
                color="rgba(251, 146, 60, 0.3)"
                position="bottom-left"
                animation="spin"
                animationDuration="15s"
            />
            <FloatingShape
                type="circle"
                size={40}
                color="rgba(251, 191, 36, 0.28)"
                blur={12}
                position="center-right"
                animation="pulse"
                animationDuration="4s"
                animationDelay="0.5s"
            />

            {/* iPhone Mockup */}
            <div className="relative z-10 animate-fade-in-up">
              <div className="relative w-full h-[600px] mx-auto [perspective:1200px]">
                {/* Phone image without frame */}

                <img

                    src="/iPhone 17 Pro.png"
                    alt="Mockup de iPhone mostrando la aplicación ECIXPRESS con código QR para recoger pedidos sin filas en el campus"
                    className="
                    absolute right-[-550px] top-[50%] -translate-y-1/2
                    w-[900px]
                    max-w-none
                    object-contain
                    drop-shadow-[0_40px_100px_rgba(0,0,0,0.2)]
                    rotate-[12deg]
                    hover:scale-105 hover:rotate-[8deg] transition-transform duration-500

                  "
                />
                <div className="absolute inset-0 bg-yellow-300 opacity-10 blur-3xl scale-110 -z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

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
