import React from 'react';
import { useOutletContext } from 'react-router-dom';
import TrianglePattern from '../../../components/home/TrianglePattern';

interface AccountSectionHeaderProps {
  titulo: string;
  children?: React.ReactNode;
}

const AccountSectionHeader: React.FC<AccountSectionHeaderProps> = ({ titulo, children }) => {
  const { sidebarExpanded = false } = useOutletContext<{ sidebarExpanded?: boolean }>() ?? {};

  return (
    <header
      className={`admin-hero-banner theme-surface relative overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(140deg,rgb(var(--accent-rgb)/0.32)_0%,rgba(255,255,255,0.62)_42%,rgb(var(--accent-rgb)/0.14)_72%,rgb(var(--accent-rgb)/0.36)_100%)] backdrop-blur-2xl [box-shadow:0_28px_50px_-28px_rgb(var(--accent-rgb)/0.45)] ${
        sidebarExpanded ? 'admin-hero-expanded' : ''
      }`}
    >
      <div aria-hidden="true" className="theme-surface absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[rgb(var(--accent-rgb)/0.32)] blur-3xl" />
      <div aria-hidden="true" className="theme-surface absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-[rgb(var(--accent-rgb)/0.20)] blur-3xl" />
      <TrianglePattern className={`admin-hero-triangles ${sidebarExpanded ? 'admin-hero-triangles-expanded' : ''}`} />

      <div className="relative z-10 flex min-h-[112px] flex-col justify-center gap-4 px-5 py-5 md:min-h-[132px] md:px-8 md:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="admin-hero-copy space-y-3">
          <nav className="inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegacion">
            Mi cuenta <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-950">{titulo}</span>
          </nav>
          <h1 className="font-display text-3xl font-semibold leading-tight text-gray-900 md:text-[clamp(1.9rem,2.6vw,2.55rem)]">
            {titulo}
          </h1>
        </div>
        {children && <div className="relative z-10 flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  );
};

export default AccountSectionHeader;
