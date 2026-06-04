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
      description: 'Olvídate de las largas filas. Realiza tu pedido desde tu celular en 30 segundos.',
      gradient: 'from-yellow-400 to-yellow-600',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: QrCode,
      title: 'Recoge sin filas',
      description: 'Tu código QR personal para recoger instantáneamente sin esperas.',
      gradient: 'from-cyan-400 to-blue-600',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: ShoppingBag,
      title: 'Compra fácil',
      description: 'Explora productos, selecciona tus favoritos y confía en la calidad.',
      gradient: 'from-orange-400 to-red-600',
      image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: Zap,
      title: 'Acceso rápido',
      description: 'Interfaz intuitiva diseñada específicamente para estudiantes universitarios.',
      gradient: 'from-purple-400 to-pink-600',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: BarChart3,
      title: 'Organización total',
      description: 'Controla tu historial de pedidos, gastos y preferencias en un solo lugar.',
      gradient: 'from-green-400 to-teal-600',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: Bell,
      title: 'Notificaciones en tiempo real',
      description: 'Recibe alertas cuando tu pedido esté listo para recoger.',
      gradient: 'from-indigo-400 to-purple-600',
      image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <section
      id="features"
      className="py-16 md:py-24 px-6 bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            ¿Por qué ECIXPRESS?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Seis razones por las que miles de estudiantes ya nos usan
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-white border border-gray-200 hover:border-yellow-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-3 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                {/* Image Background */}
                <div className="relative h-32 mb-6 rounded-xl overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  {/* Icon Container */}
                  <div className={`absolute bottom-4 left-4 p-3 rounded-lg bg-gradient-to-r ${feature.gradient} shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Accent line */}
                <div className="mt-6 w-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 group-hover:w-12 transition-all duration-500" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

