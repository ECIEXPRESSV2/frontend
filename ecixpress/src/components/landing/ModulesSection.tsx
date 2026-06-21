import React from 'react';
import {
  ShoppingCart,
  Wallet,
  QrCode,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';

const ModulesSection: React.FC = () => {
  const modules = [
    {
      icon: ShoppingCart,
      title: 'Módulo de Pedidos',
      description: 'Explora catálogo completo, crea tu carrito, programa hora de recogida y confirma.',
      features: ['Catálogo dinámico', 'Horarios personalizados', 'Preferencias guardadas'],
      color: 'from-yellow-400 to-yellow-600',
    },
    {
      icon: Wallet,
      title: 'Pagos y Monedero',
      description: 'Sistema seguro de pagos: tarjeta crédito, débito, wallet universitario o efectivo.',
      features: ['Múltiples métodos', 'Transacciones seguras', 'Historial detallado'],
      color: 'from-cyan-400 to-blue-600',
    },
    {
      icon: QrCode,
      title: 'QR y Entrega',
      description: 'Código QR único para cada pedido. Validación instantánea sin filas.',
      features: ['Generación automática', 'Escáner rápido', 'Seguimiento en vivo'],
      color: 'from-green-400 to-teal-600',
    },
    {
      icon: BarChart3,
      title: 'Inventario y Reportes',
      description: 'Dashboard para vendedores: control de stock, ventas, análisis de datos.',
      features: ['Stock en tiempo real', 'Reportes avanzados', 'Predicción de demanda'],
      color: 'from-purple-400 to-pink-600',
    },
    {
      icon: Bell,
      title: 'Notificaciones en Tiempo Real',
      description: 'Alertas instantáneas sobre cambios en pedidos, promociones y estado de entrega.',
      features: ['Push notifications', 'SMS', 'Email personalizados'],
      color: 'from-orange-400 to-red-600',
    },
    {
      icon: Settings,
      title: 'Panel Administrativo',
      description: 'Control total de la plataforma: usuarios, vendedores, transacciones y soporte.',
      features: ['Gestión de usuarios', 'Control financiero', 'Reportería avanzada'],
      color: 'from-indigo-400 to-purple-600',
    },
  ];

  return (
    <section
      id="modules"
      className="py-16 md:py-24 px-6 bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Módulos del sistema
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Una plataforma completa diseñada para cada actor del ecosistema
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {modules.map((module, index) => {
            const Icon = module.icon;
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl border border-gray-200 bg-white hover:border-yellow-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${module.color} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-600 transition-colors">
                    {module.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    {module.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-2 pt-6 border-t border-gray-200">
                    {module.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 mt-1.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center space-y-4 animate-fade-in-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <p className="text-lg text-gray-600">
            ¿Listo para transformar la forma en que compras en tu campus?
          </p>
          <button className="px-10 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all inline-block">
            Crear cuenta gratis
          </button>
        </div>
      </div>
    </section>
  );
};

export default ModulesSection;

