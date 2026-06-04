import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLoginClick, onSignUpClick }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-3 z-50 w-full bg-gradient-to-r from-white/80 to-yellow-50/60 backdrop-blur-xl border border-white/40 shadow-lg rounded-xl mx-6 mt-4">
      <div className="w-full px-12 py-3 md:py-4 gap-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 h:scale-105 transition">
            <img
              src="/logotipoEcixpress.svg"
              alt="Ecixpress"
              className="h-9 md:h-10 hover:scale-105 transition"
            />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-lg font-medium relative text-lg font-medium text-gray-600
            hover:text-gray-900 transition transition
            after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px]
            after:bg-yellow-500 after:transition-all hover:after:w-full
            ">
              Características
            </a>
            <a href="#how-it-works" className="text-lg font-medium relative text-lg font-medium text-gray-600
            hover:text-gray-900 transition transition
            after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px]
            after:bg-yellow-500 after:transition-all hover:after:w-full
            ">
              Cómo funciona
            </a>
            <a href="#modules" className="text-lg font-medium relative text-lg font-medium text-gray-600
            hover:text-gray-900 transition transition
            after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px]
            after:bg-yellow-500 after:transition-all hover:after:w-full
            ">
              Módulos
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onLoginClick}
              className="px-5 py-2 text-xl font-semibold text-gray-900 hover:text-yellow-600 transition"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={onSignUpClick}
              className="px-6 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transition-all hover:shadow-lg"
            >
              Comenzar
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden pt-4 border-t border-gray-100 mt-4 space-y-3">
            <a href="#features" className="block text-sm font-medium text-gray-700 hover:text-yellow-600 transition">
              Características
            </a>
            <a href="#how-it-works" className="block text-sm font-medium text-gray-700 hover:text-yellow-600 transition">
              Cómo funciona
            </a>
            <a href="#modules" className="block text-sm font-medium text-gray-700 hover:text-yellow-600 transition">
              Módulos
            </a>
            <div className="space-y-2 pt-3">
              <button
                onClick={onLoginClick}
                className="w-full px-5 py-2 text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={onSignUpClick}
                className="w-full px-6 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 transition-all"
              >
                Comenzar
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

