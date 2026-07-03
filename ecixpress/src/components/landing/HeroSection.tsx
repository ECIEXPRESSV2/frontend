import React from 'react';
import { ArrowRight } from 'lucide-react';

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-body text-sm font-semibold text-a11y-yellow-darker">Pide. Llega. Recoge.</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-5">
              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-gray-900 leading-tight animate-slide-up">
                Compra en el campus{' '}
                <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent animate-gradient-shift">
                  sin hacer filas
                </span>
              </h1>
              <p className="font-body text-xl text-gray-600 leading-relaxed max-w-xl animate-slide-up-delay-1">
                Pide comida, papelería y mucho más. Recoge sin esperas. Paga en línea o en sitio.
                La forma inteligente de comprar en la universidad.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-slide-up-delay-2">
              <button
                onClick={onGetStartedClick}
                className="px-8 py-4 rounded-xl font-body font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 group hover:shadow-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Crear cuenta gratis
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onSignInClick}
                className="px-8 py-4 rounded-xl font-body font-semibold text-gray-700 bg-transparent border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Iniciar sesión
              </button>
            </div>

            {/* Trust Indicators */}

          </div>

          {/* Right Visual - iPhone Mockup */}
          <div className="relative h-full min-h-[650px] hidden md:flex items-center justify-center">
            {/* Un solo glow ambiental, sin shapes compitiendo con el producto */}
            <div className="absolute w-[520px] h-[520px] bg-yellow-300/25 blur-[100px] rounded-full pointer-events-none" />

            {/* iPhone Mockup — protagonista único del hero */}
            <div className="relative z-10 animate-fade-in-up">
              <div className="relative w-full h-[620px] mx-auto [perspective:1200px]">
                <img
                    src="/iPhone 17 Pro.png"
                    alt="Mockup de iPhone mostrando la aplicación ECIXPRESS con código QR para recoger pedidos sin filas en el campus"
                    className="
                    absolute right-[-500px] top-[50%] -translate-y-1/2
                    w-[940px]
                    max-w-none
                    object-contain
                    drop-shadow-[0_50px_80px_rgba(0,0,0,0.28)]
                    rotate-[6deg]
                    hover:scale-[1.03] hover:rotate-[3deg] transition-transform duration-500

                  "
                />
                {/* Sombra de apoyo — ancla el producto al suelo visual */}
                <div className="absolute bottom-[6%] right-[8%] w-[280px] h-[40px] bg-black/20 blur-2xl rounded-full -z-10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
