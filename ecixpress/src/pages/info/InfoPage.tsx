import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TrianglePattern from '../../components/home/TrianglePattern';

interface InfoSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

interface InfoPageContent {
  title: string;
  intro: string;
  sections: InfoSection[];
}

/** Contenido de las páginas informativas enlazadas desde el pie de página del Home. */
const PAGES: Record<string, InfoPageContent> = {
  about: {
    title: 'Acerca de nosotros',
    intro:
      'ECIEXPRESS es la plataforma de pedidos del campus de la Escuela Colombiana de Ingeniería Julio Garavito: pide en las tiendas y cafeterías de la universidad desde cualquier lugar, sin filas.',
    sections: [
      {
        heading: 'Nuestra misión',
        paragraphs: [
          'Devolverle tiempo a la comunidad ECI. Cada minuto que no pasas en una fila es un minuto para estudiar, descansar o compartir. Conectamos a estudiantes, profesores y colaboradores con las tiendas del campus a través de una experiencia simple, rápida y transparente.',
        ],
      },
      {
        heading: 'Quiénes somos',
        paragraphs: [
          'Somos un equipo de estudiantes de Ingeniería de Sistemas de la Escuela, y construimos ECIEXPRESS como un producto real para nuestra propia comunidad: lo usamos, lo probamos y lo mejoramos todos los días desde el campus.',
        ],
      },
      {
        heading: 'Cómo funciona',
        list: [
          'Explora las tiendas disponibles del campus y arma tu pedido.',
          'Paga desde la app con tu saldo ECIEXPRESS.',
          'Sigue el estado de tu pedido en tiempo real.',
          'Recoge mostrando tu código QR — sin filas.',
        ],
      },
    ],
  },
  contacto: {
    title: 'Contáctanos',
    intro: 'Estamos en el campus y siempre disponibles por nuestros canales digitales.',
    sections: [
      {
        heading: 'Canales de atención',
        list: [
          'WhatsApp: +57 318 618 8826 (lunes a viernes, 7:00 a.m. – 7:00 p.m.)',
          'Teléfono de tiendas: (601) 668 3600',
          'Correo: soporte@eciexpress.co',
          'Instagram: @eciexpress · TikTok: @eci_express',
        ],
      },
      {
        heading: 'Dónde estamos',
        paragraphs: [
          'Escuela Colombiana de Ingeniería Julio Garavito — AK 45 No. 205-59 (Autopista Norte), Bogotá, Colombia.',
          'Encuentra cada tienda dentro del campus con el mapa interactivo disponible en el Home (botón "Nuevo pedido" o "Mapa del campus" en el pie de página).',
        ],
      },
    ],
  },
  ayuda: {
    title: 'Ayuda y preguntas frecuentes',
    intro: 'Las respuestas a lo que más nos preguntan. Si algo no aparece aquí, escríbenos por WhatsApp.',
    sections: [
      {
        heading: '¿Cómo hago un pedido?',
        paragraphs: [
          'Entra al Home, elige una tienda (o tócala en el mapa del campus), agrega productos a tu carrito y confirma. Puedes seguir el estado del pedido desde el banner de "Pedido activo" o en "Mis pedidos".',
        ],
      },
      {
        heading: '¿Cómo pago?',
        paragraphs: [
          'Con tu saldo ECIEXPRESS: recárgalo desde tu perfil en la sección de pagos. El valor del pedido se descuenta automáticamente al confirmarlo.',
        ],
      },
      {
        heading: '¿Cómo recojo mi pedido?',
        paragraphs: [
          'Cuando tu pedido esté listo recibirás una notificación. Acércate a la tienda y muestra el código QR de tu pedido — ese es tu turno, sin filas.',
        ],
      },
      {
        heading: '¿Puedo cancelar un pedido?',
        paragraphs: [
          'Puedes cancelarlo mientras la tienda no lo haya confirmado. Después de confirmado, contáctanos por WhatsApp y lo revisamos con la tienda.',
        ],
      },
    ],
  },
  legal: {
    title: 'Términos y condiciones',
    intro: 'Condiciones de uso de la plataforma ECIEXPRESS. Al usar la aplicación aceptas estos términos.',
    sections: [
      {
        heading: '1. El servicio',
        paragraphs: [
          'ECIEXPRESS es una plataforma que intermedia pedidos entre los usuarios de la comunidad ECI y las tiendas del campus. La preparación y calidad de los productos es responsabilidad de cada tienda.',
        ],
      },
      {
        heading: '2. Cuentas y uso',
        list: [
          'La cuenta es personal e intransferible; eres responsable de su custodia.',
          'El saldo ECIEXPRESS solo es utilizable dentro de la plataforma.',
          'Nos reservamos el derecho de suspender cuentas ante usos fraudulentos.',
        ],
      },
      {
        heading: '3. Pedidos y pagos',
        list: [
          'El pedido se cobra al confirmarse la reserva de productos en la tienda.',
          'Si una tienda no puede cumplir un pedido, el valor se reintegra a tu saldo.',
          'Los precios los define cada tienda y pueden cambiar sin previo aviso.',
        ],
      },
    ],
  },
  privacidad: {
    title: 'Tratamiento de datos personales',
    intro:
      'En cumplimiento de la Ley 1581 de 2012 y sus decretos reglamentarios, te contamos cómo tratamos tus datos.',
    sections: [
      {
        heading: 'Qué datos tratamos',
        list: [
          'Datos de identificación: nombre y correo institucional.',
          'Datos transaccionales: pedidos, pagos con saldo y su historial.',
          'Datos de uso: interacciones con la aplicación para mejorar el servicio.',
        ],
      },
      {
        heading: 'Para qué los usamos',
        list: [
          'Gestionar tus pedidos y pagos dentro del campus.',
          'Notificarte el estado de tus pedidos.',
          'Mejorar la experiencia y la seguridad de la plataforma.',
        ],
      },
      {
        heading: 'Tus derechos',
        paragraphs: [
          'Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos escribiendo a soporte@eciexpress.co. Nunca vendemos tus datos a terceros.',
        ],
      },
    ],
  },
};

/**
 * Plantilla de página informativa (pie de página del Home): mismo lenguaje glass del
 * resto de la app, con el patrón de triángulos del logo de fondo.
 */
const InfoPage: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const page = slug ? PAGES[slug] : undefined;

  if (!page) return <Navigate to="/home" replace />;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100 font-body">
      <TrianglePattern className="opacity-70" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Volver al inicio
          </button>
          <img src="/ecixpress-logo.svg" alt="ECIEXPRESS" className="h-7 md:h-8" />
        </div>

        <main className="overflow-hidden rounded-[32px] border border-white/60 bg-white/70 px-5 py-7 shadow-[0_18px_40px_-24px_rgb(var(--accent-rgb)/0.35)] backdrop-blur-2xl md:px-10 md:py-9">
          <h1 className="font-display text-2xl font-semibold text-gray-900 md:text-3xl">{page.title}</h1>
          <p className="mt-3 text-sm text-gray-600 md:text-base">{page.intro}</p>

          <div className="mt-7 space-y-7">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-2 font-display text-lg font-semibold text-[var(--accent-600)]">{section.heading}</h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="mb-2 text-sm leading-relaxed text-gray-600">
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="space-y-1.5">
                    {section.list.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                        <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-400)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </main>

        <p className="mt-6 text-center text-xs text-gray-400">
          Copyright © {new Date().getFullYear()} ECIEXPRESS. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default InfoPage;
