import React from 'react';
import { ArrowRight, Lock, Mail, MapPin, Phone } from 'lucide-react';

interface CTAFinalProps {
  onSignUpClick?: () => void;
}

const CTAFinal: React.FC<CTAFinalProps> = ({ onSignUpClick }) => {
  const handleViewDemo = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
      <section className="relative py-20 md:py-28 px-6 overflow-hidden bg-gradient-to-br from-yellow-50 via-white to-cyan-50">

        {/* ✅ glow decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-yellow-300/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-yellow-200 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-body text-sm font-semibold text-gray-800">
            Disponible ahora en tu campus
          </span>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h2 className="font-display text-4xl md:text-6xl font-semibold text-gray-900 leading-tight">
              Únete a la nueva forma de{' '}
              <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">
              comprar en tu universidad
            </span>
            </h2>

            <p className="font-body text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Menos esperas, más tiempo para lo que importa.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">

            <button
                onClick={onSignUpClick}
                className="relative px-8 py-4 rounded-xl font-body font-semibold text-gray-900
            bg-gradient-to-r from-primary to-amber-500
            shadow-lg hover:shadow-amber-300/50
            hover:scale-105 active:scale-95 transition-all duration-300
            flex items-center justify-center gap-2 group overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >

              {/* glow hover */}
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />

              Crear cuenta gratis
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
                onClick={handleViewDemo}
                className="px-8 py-4 rounded-xl font-body font-semibold text-gray-700 bg-transparent border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Ver demo
            </button>

          </div>

          {/* Micro-señal de confianza, junto a la decisión de conversión */}
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Lock size={14} />
            <span className="font-body text-xs tracking-wide">Pago seguro</span>
          </div>

          {/* Trust strip — franja de contraste única, cerca del CTA */}
          <div className="pt-6 rounded-2xl bg-gray-950 grid grid-cols-3 divide-x divide-white/10 overflow-hidden">

            {[
              { value: '0%', label: 'Comisión por transacción' },
              { value: '24/7', label: 'Soporte disponible' },
              { value: '< 2 min', label: 'Tiempo promedio de recogida' },
            ].map((item, index) => (
                <div
                    key={index}
                    className="p-6 text-center hover:bg-white/5 transition-colors duration-300"
                >
                  <p className="font-display text-2xl md:text-3xl font-semibold text-white">
                    {item.value}
                  </p>
                  <p className="font-body text-xs md:text-sm text-gray-400 mt-1">{item.label}</p>
                </div>
            ))}

          </div>

        </div>
      </section>
  );
};

interface FooterProps {
  // Props para extensión futura si es necesario
}

const Footer: React.FC<FooterProps> = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="font-body bg-gray-950 text-gray-300 px-6 py-12 md:py-16 animate-fade-in-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
      <div className="max-w-7xl mx-auto ">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div>
              <img
                src="/logotipoEcixpress.svg"
                alt="Ecixpress"
                className="h-8 w-auto brightness-0 invert hover:scale-[1.02]"
              />
            </div>
            <p className="text-sm text-gray-400">
              La plataforma de pedidos para tu campus.
            </p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-white transition hover:scale-110 transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition hover:scale-110 transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="GitHub">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 002.856-3.51 10 10 0 01-2.856.175 10 10 0 00-7.737-4.247 9.753 9.753 0 00-7.738 4.247 10 10 0 002.856-.175 10 10 0 00.637 2.482c-4.547 2.177-7.843 6.782-7.843 12.018 0 1.315.236 2.59.697 3.832A9.975 9.975 0 002 24h2.969a5.99 5.99 0 005.924-4.487 5.987 5.987 0 005.924 4.487h2.969c1.238-3.226 2.048-6.797 2.048-10.57 0-5.236-3.296-9.841-7.843-12.018z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition hover:scale-110 transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05 1.883 0 3.616-.605 5.038-1.637-1.881-.037-3.463-1.27-4.066-2.964.623.095 1.209.06 1.765-.196-1.963-.395-3.431-2.128-3.431-4.202v-.051c.575.325 1.231.518 1.931.542-1.15-.766-1.912-2.081-1.912-3.569 0-.785.212-1.51.582-2.14 2.12 2.589 5.298 4.29 8.889 4.467-.072-.326-.112-.658-.112-.991 0-2.396 1.944-4.338 4.338-4.338 1.249 0 2.374.533 3.154 1.385 1.003-.196 1.946-.561 2.795-1.061-.328 1.016-.999 1.869-1.88 2.41.896-.089 1.772-.346 2.577-.893-.593.875-1.346 1.641-2.21 2.26z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold">Producto</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#features" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Características</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Cómo funciona</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Precios</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold">Empresa</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Acerca de</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Blog</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Carreras</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Prensa</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Privacidad</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Términos de servicio</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Política de cookies</a></li>
              <li><a href="#" className="hover:text-white transition hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Contacto</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contacto</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2 group">
                <Mail size={18} className="text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <a href="mailto:support@ecixpress.com" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">
                  support@ecixpress.com
                </a>
              </li>
              <li className="flex items-start gap-2 group">
                <Phone size={18} className="text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <a href="tel:+1234567890" className="hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">
                  +1 (234) 567-890
                </a>
              </li>
              <li className="flex items-start gap-2 group">
                <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span>Tu Campus, Ciudad, País</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between text-sm text-gray-400">
          <p>&copy; {currentYear} Ecixpress. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition hover:translate-y-[-2px] inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Estado</a>
            <a href="#" className="hover:text-white transition hover:translate-y-[-2px] inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Seguridad</a>
            <a href="#" className="hover:text-white transition hover:translate-y-[-2px] inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export { CTAFinal, Footer };

