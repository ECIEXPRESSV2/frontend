import React from 'react';

const IMAGES = [
  // Food images (keep some)
  "https://images.unsplash.com/photo-1604908176997-4316c288032e?w=400&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
  "https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  // Stationery images from Unsplash
  "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&q=80",
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400&q=80",
  "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&q=80",
  "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80",
  "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80",
  // Real university images from public folder
  "/EDIFICIO-E-ESCUELA.JPG",
  "/FOTOCAFETERIA.JPG",
  "/FOTOELIZASEBASSOFI.JPG",
  "/FOTOESCUELA.jpg",
  "/FOTOOSWALDO.JPG",
];

const splitIntoRows = (items: string[], rows: number): string[][] =>
    items.reduce<string[][]>(
        (acc, item, i) => {
          acc[i % rows].push(item);
          return acc;
        },
        Array.from({ length: rows }, () => [])
    );

const FALLBACK =
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80";

// Ancho de difuminado en los bordes de cada foto = solape entre fotos contiguas.
// Al ser igual al ancho del degradado, las fotos se funden una con otra sin huecos.
const FEATHER = 26;

// Máscara que desvanece los bordes izq/der de cada foto para que se mezcle con la vecina.
const tileMask =
    `linear-gradient(to right, transparent 0, #000 ${FEATHER}px, #000 calc(100% - ${FEATHER}px), transparent 100%)`;

interface ScrollRowProps {
  images: string[];
  duration: number;
  reverse?: boolean;
  offset?: number;
}

const ScrollRow: React.FC<ScrollRowProps> = ({ images, duration, reverse = false, offset = 0 }) => {
  // Repetimos las imágenes para que un "set" sea más ancho que cualquier pantalla,
  // y duplicamos el set para el bucle continuo (translate -50%).
  const oneSet = [...images, ...images];
  const looped = [...oneSet, ...oneSet];

  return (
      <div className="relative flex-1 overflow-hidden">
        <div
            className="mosaic-row flex h-full w-max"
            style={{
              animation: `scroll-${reverse ? 'right' : 'left'} ${duration}s linear infinite`,
              animationDelay: `-${offset}s`,
            }}
        >
          {looped.map((src, i) => (
              <img
                  key={`${src}-${i}`}
                  src={src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="h-full w-72 flex-shrink-0 object-cover"
                  style={{
                    // Solape: el borde difuminado de una foto se monta sobre la siguiente.
                    marginLeft: `-${FEATHER}px`,
                    maskImage: tileMask,
                    WebkitMaskImage: tileMask,
                  }}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK;
                  }}
              />
          ))}
        </div>
      </div>
  );
};

const FoodCarousel: React.FC = () => {
  const [row1, row2, row3] = splitIntoRows(IMAGES, 3);

  // Filas con flex-1 → llenan todo el alto sin huecos; sin gap → pegadas entre sí.
  return (
      <div className="flex h-full w-full flex-col">
        <ScrollRow images={row1} duration={70} offset={0} />
        <ScrollRow images={row2} duration={85} reverse offset={12} />
        <ScrollRow images={row3} duration={75} offset={6} />
      </div>
  );
};

export default FoodCarousel;
