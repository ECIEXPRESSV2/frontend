export interface FAQItem {
  category: string;
  questions: {
    question: string;
    answer: string;
  }[];
}

export const faqData: FAQItem[] = [
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
        answer: 'Estamos presentes en varios campus universitarios y seguimos sumando más cada semestre. Escríbenos para confirmar si tu universidad ya está disponible.',
      },
    ],
  },
  {
    category: 'Uso',
    questions: [
      {
        question: '¿Cómo funciona el sistema de QR?',
        answer: 'Tu QR es único por pedido y se genera automáticamente al confirmar el pago. Si tienes problemas para escanearlo, el establecimiento puede validarlo manualmente con tu número de orden.',
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
        answer: 'Sí. Nunca almacenamos los datos completos de tu tarjeta y cada transacción pasa por un proveedor de pagos certificado.',
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
        answer: 'Contáctanos en partners@ecixpress.com. Integramos tu negocio con un dashboard propio para controlar stock, ventas y reportes, además de soporte completo durante la puesta en marcha.',
      },
      {
        question: '¿Hay costos para los establecimientos?',
        answer: 'Ofrecemos planes flexibles adaptados a diferentes tipos de negocios. Contáctanos para una cotización personalizada según tus necesidades.',
      },
    ],
  },
];
