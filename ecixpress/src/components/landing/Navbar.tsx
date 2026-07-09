import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

const NAV_LINK_CLASS = `font-body text-base font-medium relative text-gray-600
  hover:text-gray-900 transition
  after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px]
  after:bg-primary after:transition-all hover:after:w-full
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm`;

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onSignUpClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-3 z-50 w-full bg-gradient-to-r from-white/80 to-yellow-50/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-xl mx-6 mt-4 [transform:translateZ(0)] [-webkit-transform:translateZ(0)] [backface-visibility:hidden] will-change-transform">
      <div className="w-full px-6 md:px-12 py-3 md:py-4 gap-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 transition">
            <img
              src="/ecixpress-logo.svg"
              alt="Ecixpress"
              className="h-9 md:h-10 hover:scale-105 transition"
            />
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className={NAV_LINK_CLASS}>
              Características
            </a>
            <a href="#how-it-works" className={NAV_LINK_CLASS}>
              Cómo funciona
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="px-5 py-2 font-body text-base font-semibold text-gray-700 hover:text-gray-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
            >
              Iniciar sesión
            </button>
            <button
              onClick={onSignUpClick}
              className="px-6 py-2.5 rounded-xl font-body font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Crear cuenta gratis
            </button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pt-4 border-t border-gray-100 mt-4 space-y-3">
            <a
              href="#features"
              className="block font-body text-sm font-medium text-gray-700 hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              Características
            </a>
            <a
              href="#how-it-works"
              className="block font-body text-sm font-medium text-gray-700 hover:text-primary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
            >
              Cómo funciona
            </a>
            <div className="space-y-2 pt-3">
              <button
                onClick={onLoginClick}
                className="w-full px-5 py-2 font-body text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Iniciar sesión
              </button>
              <button
                onClick={onSignUpClick}
                className="w-full px-6 py-2.5 rounded-lg font-body font-semibold text-gray-900 bg-gradient-to-r from-primary to-amber-500 hover:from-amber-500 hover:to-amber-600 shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Crear cuenta gratis
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
