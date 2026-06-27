import React from 'react';
import { Construction } from 'lucide-react';
import AccountSectionHeader from '../AccountSectionHeader';

interface PlaceholderSectionProps {
  titulo: string;
  descripcion?: string;
}

const PlaceholderSection: React.FC<PlaceholderSectionProps> = ({
  titulo,
  descripcion = 'Esta sección estará disponible próximamente.',
}) => (
  <>
    <AccountSectionHeader titulo={titulo} />
    <div className="rounded-3xl border border-white/70 bg-white/82 p-10 text-center shadow-lg shadow-gray-200/60 backdrop-blur-xl">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-200 bg-gradient-to-br from-white to-yellow-50 text-amber-600 shadow-md">
        <Construction size={26} aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-gray-900">{titulo}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{descripcion}</p>
    </div>
  </>
);

export default PlaceholderSection;
