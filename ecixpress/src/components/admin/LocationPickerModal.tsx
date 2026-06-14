import React, { useEffect, useState } from 'react';
import { X, MapPin, Check } from 'lucide-react';
import { campusMapHtml } from './campusMapHtml';

interface Props {
  open: boolean;
  initial?: string;
  onClose: () => void;
  onSelect: (location: string) => void;
}

/**
 * Selector de ubicación: abre el mapa 3D del campus en un iframe. Al hacer click en
 * un edificio, el mapa emite un postMessage con el nombre del bloque; aquí lo
 * recibimos y, al confirmar, lo devolvemos como valor de "ubicación".
 */
const LocationPickerModal: React.FC<Props> = ({ open, initial, onClose, onSelect }) => {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelected(initial ?? null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; name?: string } | null;
      if (!data || typeof data.name !== 'string') return;
      if (data.type === 'campus-select') {
        setSelected(data.name);
      } else if (data.type === 'campus-confirm') {
        onSelect(data.name);
        onClose();
      }
    };
    window.addEventListener('message', onMessage);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('message', onMessage);
      document.body.style.overflow = '';
    };
  }, [open, onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Elegir ubicación en el campus</h2>
            <p className="text-xs text-gray-500">Toca un edificio en el mapa 3D para seleccionarlo</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 relative">
          <iframe
            title="Mapa 3D del campus"
            srcDoc={campusMapHtml}
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <MapPin size={16} className="text-yellow-500 flex-shrink-0" />
            {selected ? (
              <span className="text-gray-900 font-medium truncate">{selected}</span>
            ) : (
              <span className="text-gray-400">Ningún edificio seleccionado</span>
            )}
          </div>
          <button
            disabled={!selected}
            onClick={() => {
              if (selected) {
                onSelect(selected);
                onClose();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-yellow-400 text-white font-semibold text-sm hover:bg-yellow-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} /> Usar esta ubicación
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerModal;
