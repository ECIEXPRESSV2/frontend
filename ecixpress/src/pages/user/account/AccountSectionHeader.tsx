import React from 'react';

interface AccountSectionHeaderProps {
  titulo: string;
  children?: React.ReactNode;
}

const AccountSectionHeader: React.FC<AccountSectionHeaderProps> = ({ titulo, children }) => (
  <header className="relative overflow-hidden rounded-[28px] border border-yellow-200/70 bg-[linear-gradient(135deg,#F4B942_0%,#FBBF24_48%,#FDE68A_100%)] p-5 shadow-lg shadow-yellow-200/60 md:p-6">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />
    <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-white/22 blur-3xl" />
    <div className="pointer-events-none absolute right-[-90px] top-[-110px] h-72 w-72 rounded-full bg-[#FB923C]/22 blur-3xl" />
    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <nav className="mb-3 inline-flex items-center rounded-xl border border-white/70 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur" aria-label="Ruta de navegación">
          Mi cuenta <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-950">{titulo}</span>
        </nav>
        <h1 className="text-3xl font-bold tracking-normal text-white md:text-4xl">{titulo}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  </header>
);

export default AccountSectionHeader;
