import React, { useEffect, useRef, useState } from 'react';
import { Users, BookOpen, Utensils, TrendingUp } from 'lucide-react';

const UniversityContextSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  // ✅ scroll reveal tipo Apple
  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
          }
        },
        { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  const stats = [
    {
      icon: Users,
      title: 'Para todos',
      description: 'Un solo ecosistema para toda la comunidad.',
      gradient: 'from-yellow-400 to-yellow-600',
      image: '/FOTOELIZASEBASSOFI.JPG',
    },
    {
      icon: BookOpen,
      title: 'Entre clases',
      description: 'Pide rápido sin interrumpir tu día.',
      gradient: 'from-blue-400 to-indigo-600',
      image: '/FOTOESCUELA.jpg',
    },
    {
      icon: Utensils,
      title: 'Todo en una app',
      description: 'Comida, cafeterías y más.',
      gradient: 'from-orange-400 to-red-500',
      image: '/FOTOOSWALDO.JPG',
    },
    {
      icon: TrendingUp,
      title: 'Crece contigo',
      description: 'Más opciones cada semana.',
      gradient: 'from-green-400 to-emerald-600',
      image: '/FOTOCAFETERIA.JPG',
    },
  ];

  return (
      <section
          ref={sectionRef}
          className="relative py-24 px-6 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden"
      >
        {/* glow fondo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-300/10 blur-[120px] rounded-full" />

        <div className="relative max-w-7xl mx-auto">

          {/* HERO */}
          <div
              className={`grid md:grid-cols-2 gap-16 items-center mb-24 transition-all duration-1000 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
          >

            {/* LEFT */}
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                Hecho para la vida{' '}
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                en campus
              </span>
              </h2>

              <p className="text-lg text-gray-600">
                Diseñado para eliminar filas, optimizar tu tiempo y mejorar tu día.
              </p>

              <ul className="space-y-4">
                {['Pide desde clase', 'Recoge en minutos', 'Paga como quieras', 'Sin fricción'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 group">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 group-hover:scale-150 transition" />
                      <span className="text-gray-800 group-hover:text-yellow-600 transition">
                    {item}
                  </span>
                    </li>
                ))}
              </ul>
            </div>

            {/* RIGHT VISUAL */}
            <div
                className={`relative hidden md:flex justify-center transition-all duration-1000 delay-200 ease-out
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            >
              {/* glow */}
              <div className="absolute w-[450px] h-[450px] bg-yellow-300/20 blur-[80px] rounded-full" />

              <img
                  src= "/EDIFICIO-E-ESCUELA.JPG"
                  className="relative w-[340px] h-[340px] object-cover rounded-2xl shadow-3xl
              hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* GRID */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

            {stats.map((stat, index) => {
              const Icon = stat.icon;

              return (
                  <div
                      key={index}
                      className={`group relative rounded-2xl overflow-hidden transition-all duration-700 ease-out
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}
                      style={{ transitionDelay: `${index * 120}ms` }}
                  >

                    <img
                        src={stat.image}
                        className="absolute inset-0 w-full h-full object-cover scale-110 group-hover:scale-125 transition duration-700"
                    />

                    {/*  overlay para contraste */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition" />

                    {/*  contenido */}
                    <div className="relative z-10 p-6 space-y-4 text-white">

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                  bg-white/20 backdrop-blur-sm border border-white/30
                  group-hover:scale-110 transition`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <h3 className="font-bold text-lg">
                        {stat.title}
                      </h3>

                      <p className="text-sm text-white/80">
                        {stat.description}
                      </p>

                    </div>

                    {/* glow hover */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition duration-700 
                bg-gradient-to-br ${stat.gradient}`} />

                  </div>
              );
            })}

          </div>

        </div>
      </section>
  );
};

export default UniversityContextSection;