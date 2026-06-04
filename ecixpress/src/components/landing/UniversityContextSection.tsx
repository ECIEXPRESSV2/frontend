import React from 'react';
import { Users, BookOpen, Utensils, TrendingUp } from 'lucide-react';

const UniversityContextSection: React.FC = () => {
  const stats = [
    {
      icon: Users,
      title: 'Para todos',
      description: 'Estudiantes, docentes y personal administrativo en un mismo ecosistema.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      image: 'https://images.unsplash.com/photo-1453974336165-bf7476840e58?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: BookOpen,
      title: 'Entre clases',
      description: 'Pide tu almuerzo entre lecciones. Tu pedido estará listo en 30 minutos.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: Utensils,
      title: 'Menú completo',
      description: 'Cafeterías, comedores, pequeños comercios. Todo en una app.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop&q=80',
    },
    {
      icon: TrendingUp,
      title: 'Crece con nosotros',
      description: 'Cada semana nuevos vendedores, productos y oportunidades.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b91add1?w=400&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <section className="py-16 md:py-24 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Hero Content - Left Text, Right Visual */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          {/* Left */}
          <div className="space-y-6 animate-fade-in-left">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
              Hecho para la vida{' '}
              <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent animate-gradient-shift">
                en campus
              </span>
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              ECIXPRESS entiende los desafíos universitarios. Largas filas entre clases,
              tiempo limitado para comer, desorganización en compras. Por eso diseñamos
              una solución que se adapta a tu ritmo.
            </p>
            <ul className="space-y-4">
              {['Pide desde clase', 'Recoge en 5 minutos', 'Paga como prefieras', 'Sin complicaciones'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 group">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 group-hover:scale-150 transition-transform" />
                  <span className="font-medium text-gray-800 group-hover:text-yellow-600 transition-colors">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right - Visual */}
          <div className="relative h-96 hidden md:flex items-center justify-center animate-fade-in-up">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-100 to-cyan-50 rounded-3xl opacity-50 blur-2xl animate-float" />
            <div className="relative z-10">
              <img
                src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop&q=80"
                alt="Campus universitario"
                className="w-80 h-80 object-cover rounded-2xl shadow-2xl hover:scale-105 hover:rotate-1 transition-all duration-500"
              />
              <div className="text-center mt-4 space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Campus inteligente</h3>
                <p className="text-gray-600">Eficiencia, organización y comodidad</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-white border border-gray-200 hover:border-yellow-200 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
              >
                <div className="relative h-24 mb-4 rounded-xl overflow-hidden">
                  <img
                    src={stat.image}
                    alt={stat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className={`${stat.bgColor} p-3 rounded-lg absolute bottom-2 left-2`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2 group-hover:text-yellow-600 transition-colors">{stat.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{stat.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default UniversityContextSection;

