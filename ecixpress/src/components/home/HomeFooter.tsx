import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Store } from 'lucide-react';
import { TriangleGlyph } from './TrianglePattern';

/** Marca de Instagram, monocroma (lucide no incluye íconos de marca). */
const InstagramMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

/** Marca de TikTok, monocroma (lucide no incluye íconos de marca). */
const TikTokMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2.89-2.89c.3 0 .59.05.86.13V9.4a6.34 6.34 0 1 0 5.48 6.27V8.56a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1 .01z" />
  </svg>
);

const SOCIAL_LINKS = [
  { label: 'Instagram de ECIEXPRESS', href: 'https://www.instagram.com/eciexpress/', icon: <InstagramMark /> },
  { label: 'TikTok de ECIEXPRESS', href: 'https://www.tiktok.com/@eci_express', icon: <TikTokMark /> },
];

interface FooterLink {
  label: string;
  /** Ruta interna, o acción especial. */
  to?: string;
  action?: 'map';
}

const LINK_COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Nosotros',
    links: [
      { label: 'Acerca de nosotros', to: '/info/about' },
      { label: 'Contáctanos', to: '/info/contacto' },
      { label: 'Ayuda y preguntas frecuentes', to: '/info/ayuda' },
    ],
  },
  {
    title: 'Mapa del sitio',
    links: [
      { label: 'Inicio', to: '/home' },
      { label: 'Mis pedidos', to: '/orders' },
      { label: 'Mi perfil', to: '/profile' },
      { label: 'Mapa del campus', action: 'map' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos y condiciones', to: '/info/legal' },
      { label: 'Tratamiento de datos', to: '/info/privacidad' },
    ],
  },
];

interface HomeFooterProps {
  /** Abre el mapa del campus (StoreMapModal del Home). */
  onOpenMap?: () => void;
}

/**
 * Pie de página del Home, inspirado en la referencia: una franja de acento con la marca,
 * contactos y redes, y una franja oscura (contraste con el Home claro) con columnas de
 * enlaces, los triángulos del logo como decoración y la línea de copyright.
 */
const HomeFooter: React.FC<HomeFooterProps> = ({ onOpenMap }) => {
  const navigate = useNavigate();

  const handleLink = (link: FooterLink) => {
    if (link.action === 'map') onOpenMap?.();
    else if (link.to) navigate(link.to);
  };

  return (
    <footer className="app-shift mt-6">
      {/* Franja de acento: marca + contactos + redes */}
      <div className="theme-surface flex flex-wrap items-center justify-between gap-x-8 gap-y-3 bg-[linear-gradient(135deg,var(--accent-400),var(--accent-500))] px-5 py-4 text-gray-950 md:px-10">
        <span className="font-display text-2xl font-semibold tracking-wide">ECIEXPRESS</span>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm font-semibold">
          <a href="https://wa.me/573186188826" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition hover:opacity-75">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-950/80">
              <Phone size={15} aria-hidden="true" />
            </span>
            +57 318 618 8826
          </a>
          <span className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-950/80">
              <Store size={15} aria-hidden="true" />
            </span>
            (601) 668 3600
          </span>
        </div>

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-950/80 transition hover:-translate-y-0.5 hover:bg-gray-950/10"
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Franja oscura: columnas de enlaces + triángulos del logo + copyright.
          Mismo negro (gray-950) y tratamiento tipográfico/hover que el footer de landing,
          para que ambos pies de página se sientan parte de la misma marca. */}
      <div className="relative overflow-hidden bg-gray-950 px-5 pb-28 pt-9 text-gray-400 md:px-10 md:pb-6">
        {/* Decoración: los triángulos del logo hacen las veces del retrato del ejemplo */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden items-center pr-6 text-white md:flex">
          <TriangleGlyph size={220} pair rotate={-8} className="opacity-[0.05]" />
        </div>

        <div className="relative grid gap-8 sm:grid-cols-2 md:max-w-3xl md:grid-cols-3">
          {LINK_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="mb-4 font-semibold text-white">{column.title}</p>
              <ul className="space-y-2 text-sm text-gray-400">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => handleLink(link)}
                      className="inline-block transition hover:translate-x-1 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="relative mt-8 border-t border-gray-800 pt-4 text-xs text-gray-500">
          <p>
            Copyright © {new Date().getFullYear()} ECIEXPRESS. Todos los derechos reservados. ·
            Hecho por estudiantes de la Escuela Colombiana de Ingeniería Julio Garavito.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default HomeFooter;
