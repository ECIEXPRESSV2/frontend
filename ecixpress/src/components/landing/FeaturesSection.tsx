import React from 'react';
import {
  Zap,
  Clock,
  ShoppingBag,
  QrCode,
  BarChart3,
  Bell,
} from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Clock,
      title: 'Ahorra tiempo',
      description: 'Olvídate de filas. Pide en segundos desde tu celular.',
      gradient: 'from-yellow-400 to-yellow-600',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    },
    {
      icon: QrCode,
      title: 'Recoge sin filas',
      description: 'Usa tu QR y recoge sin esperar.',
      gradient: 'from-cyan-400 to-blue-600',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    },
    {
      icon: ShoppingBag,
      title: 'Compra fácil',
      description: 'Explora y ordena en pocos pasos.',
      gradient: 'from-orange-400 to-red-600',
      image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
    },
    {
      icon: Zap,
      title: 'Acceso rápido',
      description: 'Interfaz diseñada para velocidad.',
      gradient: 'from-purple-400 to-pink-600',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400',
    },
    {
      icon: BarChart3,
      title: 'Organización total',
      description: 'Controla pedidos y gastos fácilmente.',
      gradient: 'from-green-400 to-teal-600',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    },
    {
      icon: Bell,
      title: 'Alertas en tiempo real',
      description: 'Sabrás cuándo tu pedido está listo.',
      gradient: 'from-indigo-400 to-purple-600',
      image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400',
    },
  ];

  return (
      <section className="relative py-20 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden">

        {/* glow fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-300/10 blur-[140px] rounded-full" />

        <div className="relative max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 flex items-center justify-center gap-3">
              ¿Por qué{' '}
              <img
                src="/logotipoEcixpress.svg"
                alt="ECIXPRESS"
                className="h-8 md:h-9 w-auto self-center"
 />
              ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Diseñado para hacer tu experiencia en campus más rápida y eficiente
            </p>
          </div>

          {/* GRID */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                  <div
                      key={index}
                      className="group relative p-8 rounded-2xl border border-gray-200
                bg-white/40 backdrop-blur-md
                hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden focus-within:ring-2 focus-within:ring-yellow-500 focus-within:ring-offset-2"
                      tabIndex={0}
                      role="button"
                      aria-label={`${feature.title}: ${feature.description}`}
                  >

                    {/* imagen de fondo suave */}
                    <img
                        src={feature.image}
                        className="absolute inset-0 w-full h-full object-cover opacity-10 blur-sm group-hover:scale-110 transition"
                    />

                    {/* glow hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 
                  bg-gradient-to-br ${feature.gradient} blur-2xl`} />

                    {/* contenido */}
                    <div className="relative z-10 space-y-4">

                      {/* ICONO */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                    bg-gradient-to-r ${feature.gradient} shadow-md
                    group-hover:scale-110 transition`}>
                        <Icon className="text-white w-6 h-6" />
                      </div>

                      {/* TEXTO */}
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition">
                        {feature.title}
                      </h3>

                      <p className="text-gray-600 text-sm leading-relaxed">
                        {feature.description}
                      </p>

                    </div>

                  </div>
              );
            })}

          </div>
        </div>
      </section>
  );
};

export default FeaturesSection;

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