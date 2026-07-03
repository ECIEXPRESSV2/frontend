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
  const dailyChecklist = ['Pide desde clase', 'Recoge en minutos', 'Paga como quieras', 'Todo desde el celular'];

  const features = [
    {
      icon: Clock,
      title: 'Ahorra tiempo',
      description: 'Pide en segundos desde tu celular, sin perder tiempo.',
      gradient: 'from-primary to-amber-600',
    },
    {
      icon: QrCode,
      title: 'Cero esperas',
      description: 'Tu pedido te espera a ti, no al revés.',
      gradient: 'from-emerald-400 to-emerald-600',
    },
    {
      icon: ShoppingBag,
      title: 'Compra fácil',
      description: 'Explora y ordena en pocos pasos.',
      gradient: 'from-secondary to-blue-600',
    },
    {
      icon: Zap,
      title: 'Acceso rápido',
      description: 'Interfaz diseñada para velocidad.',
      gradient: 'from-primary to-amber-600',
    },
    {
      icon: BarChart3,
      title: 'Organización total',
      description: 'Controla pedidos y gastos fácilmente.',
      gradient: 'from-slate-600 to-slate-800',
    },
    {
      icon: Bell,
      title: 'Alertas en tiempo real',
      description: 'Sabrás cuándo tu pedido está listo.',
      gradient: 'from-secondary to-blue-600',
    },
  ];

  return (
      <section id="features" className="relative py-16 md:py-20 px-6 bg-gradient-to-b from-gray-50 to-white overflow-hidden scroll-mt-28">

        {/* glow fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-yellow-300/10 blur-[140px] rounded-full" />

        <div className="relative max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="text-center space-y-4 mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 flex items-center justify-center gap-3">
              ¿Por qué{' '}
              <img
                src="/logotipoEcixpress.svg"
                alt="ECIXPRESS"
                className="h-8 md:h-9 w-auto self-center"
 />
              ?
            </h2>
            <p className="font-body text-lg text-gray-600 max-w-2xl mx-auto">
              Diseñado para hacer tu experiencia en campus más rápida y eficiente
            </p>
          </div>

          {/* CHECKLIST + FOTO DE CAMPUS */}
          <div className="grid md:grid-cols-2 gap-16 items-center mb-20">
            <div className="space-y-6">
              <span className="font-body text-sm font-semibold uppercase tracking-wide text-a11y-yellow-dark">
                Tu día en el campus
              </span>
              <ul className="space-y-4">
                {dailyChecklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 group">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary group-hover:scale-150 transition" />
                    <span className="font-body text-gray-800 group-hover:text-a11y-yellow-dark transition">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative hidden md:flex justify-center">
              <div className="absolute w-[380px] h-[380px] bg-yellow-300/20 blur-[80px] rounded-full" />
              <img
                src="/EDIFICIO-E-ESCUELA.JPG"
                alt="Edificio de la escuela universitaria mostrando el campus donde opera ECIXPRESS"
                className="relative w-[300px] h-[300px] object-cover rounded-2xl shadow-xl hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* GRID */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                  <div
                      key={index}
                      className="group relative p-8 rounded-2xl border border-gray-200
                bg-white
                hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden"
                  >

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
                      <h3 className="font-display text-xl font-semibold text-gray-900 group-hover:text-gray-800 transition">
                        {feature.title}
                      </h3>

                      <p className="font-body text-gray-600 text-sm leading-relaxed">
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
