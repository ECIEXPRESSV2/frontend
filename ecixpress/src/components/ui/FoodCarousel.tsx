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

interface ScrollRowProps {
  images: string[];
  duration: number;   // segundos — filas distintas a distinta velocidad
  reverse?: boolean;  // alterna el sentido para dar profundidad
  offset?: number;    // desfase inicial para que las filas no queden alineadas
}

const FALLBACK =
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80";

const ScrollRow: React.FC<ScrollRowProps> = ({ images, duration, reverse = false, offset = 0 }) => {
  // Duplicamos para lograr un bucle continuo y sin saltos
  const looped = [...images, ...images];

  return (
      <div className="overflow-hidden">
        <div
            className="mosaic-row flex gap-4 md:gap-5 w-max"
            style={{
              animation: `scroll-${reverse ? 'right' : 'left'} ${duration}s linear infinite`,
              animationDelay: `-${offset}s`,
            }}
        >
          {looped.map((src, i) => (
              <div
                  key={`${src}-${i}`}
                  className="overflow-hidden rounded-2xl shadow-lg flex-shrink-0"
              >
                <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-40 w-60 md:h-52 md:w-80 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK;
                    }}
                />
              </div>
          ))}
        </div>
      </div>
  );
};

const FoodCarousel: React.FC = () => {
  const [row1, row2, row3] = splitIntoRows(IMAGES, 3);

  return (
      <div className="w-full h-full flex flex-col justify-center gap-4 md:gap-5">
        <ScrollRow images={row1} duration={70} offset={0} />
        <ScrollRow images={row2} duration={85} reverse offset={12} />
        <ScrollRow images={row3} duration={75} offset={6} />
      </div>
  );
};

export default FoodCarousel;
