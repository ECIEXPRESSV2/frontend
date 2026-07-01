import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Mail } from 'lucide-react';
import FloatingShape from './FloatingShapes';

interface FAQItem {
  category: string;
  questions: {
    question: string;
    answer: string;
  }[];
}

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData: FAQItem[] = [
    {
      category: 'General',
      questions: [
        {
          question: '¿Qué es ECIXPRESS?',
          answer: 'ECIXPRESS es una plataforma de pedidos para campus universitarios que te permite pedir comida, papelería y más sin hacer filas. Conecta estudiantes con establecimientos del campus para una experiencia de compra más eficiente.',
        },
        {
          question: '¿Es gratis?',
          answer: 'Sí, la aplicación es completamente gratuita para estudiantes. No cobramos comisiones por transacción. Descarga la app y empieza a usarla sin costos adicionales.',
        },
        {
          question: '¿En qué universidades está disponible?',
          answer: 'Actualmente estamos en 15+ universidades. Consulta con tu administración local para confirmar disponibilidad en tu campus. Estamos expandiéndonos constantemente.',
        },
      ],
    },
    {
      category: 'Uso',
      questions: [
        {
          question: '¿Cómo funciona el sistema de QR?',
          answer: 'Después de pagar, recibes un código QR único en la app. Preséntalo en el establecimiento y recoge tu pedido sin esperas. Es rápido, seguro y sin contacto.',
        },
        {
          question: '¿Puedo pagar en el sitio o debo pagar en línea?',
          answer: 'Ambas opciones están disponibles. Puedes pagar en línea con tarjeta o efectivo al recoger. Elige la opción que más te convenga.',
        },
        {
          question: '¿Qué pasa si mi pedido está retrasado?',
          answer: 'Recibirás notificaciones en tiempo real sobre el estado de tu pedido. Si hay retrasos, el establecimiento te informará inmediatamente para que puedas planificar tu tiempo.',
        },
      ],
    },
    {
      category: 'Seguridad',
      questions: [
        {
          question: '¿Es seguro pagar en la app?',
          answer: 'Sí, usamos encriptación SSL de nivel bancario para proteger tus datos y transacciones. Tu seguridad es nuestra prioridad absoluta.',
        },
        {
          question: '¿Qué datos personales recolectan?',
          answer: 'Solo recolectamos información necesaria para procesar pedidos: nombre, email, y datos de pago (encriptados). Nunca compartimos tu información con terceros sin tu consentimiento.',
        },
      ],
    },
    {
      category: 'Negocios',
      questions: [
        {
          question: '¿Soy dueño de un negocio en el campus, ¿cómo me uno?',
          answer: 'Contáctanos en partners@ecixpress.com para información sobre cómo integrar tu negocio. Ofrecemos planes flexibles y soporte completo para establecimientos.',
        },
        {
          question: '¿Hay costos para los establecimientos?',
          answer: 'Ofrecemos planes flexibles adaptados a diferentes tipos de negocios. Contáctanos para una cotización personalizada según tus necesidades.',
        },
      ],
    },
  ];

  const allQuestions = faqData.flatMap((item) => item.questions);

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-gradient-to-br from-white via-gray-50 to-yellow-50">
      {/* Decorative glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-yellow-200/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating shapes */}
      <FloatingShape
        type="circle"
        size={50}
        color="rgba(251, 191, 36, 0.2)"
        blur={12}
        position="top-left"
        animation="pulse"
        animationDuration="5s"
      />
      <FloatingShape
        type="diamond"
        size={35}
        color="rgba(34, 211, 238, 0.15)"
        position="bottom-right"
        animation="spin"
        animationDuration="20s"
      />

      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 border border-yellow-300">
            <HelpCircle size={16} className="text-yellow-600" />
            <span className="text-sm font-semibold text-a11y-yellow-darker">
              Preguntas Frecuentes
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight flex flex-col md:flex-row items-center justify-center gap-3">
            <span>Todo lo que necesitas saber sobre</span>
            <img
              src="/logotipoEcixpress.svg"
              alt="ECIXPRESS"
              className="h-8 md:h-9 w-auto self-center"
            />
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Encuentra respuestas a las preguntas más comunes sobre nuestra plataforma.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {allQuestions.map((item, index) => (
            <div
              key={index}
              className="relative group rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2"
                aria-expanded={openIndex === index}
              >
                <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
                <ChevronDown
                  size={20}
                  className={`text-yellow-500 transition-transform duration-300 flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-5 pt-0 text-gray-600 leading-relaxed">
                  {item.answer}
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/0 to-yellow-400/0 group-hover:from-yellow-400/5 group-hover:via-yellow-400/10 group-hover:to-yellow-400/5 transition-all duration-500 pointer-events-none" />
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-200">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Mail size={20} className="text-yellow-600" />
            <p className="font-semibold text-gray-900">¿Tienes más preguntas?</p>
          </div>
          <p className="text-gray-600">
            Contáctanos en{' '}
            <a
              href="mailto:support@ecixpress.com"
              className="text-yellow-600 hover:text-yellow-700 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 rounded"
            >
              support@ecixpress.com
            </a>
          </p>
        </div>
      </div>

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
    </section>
  );
};

export default FAQSection;
