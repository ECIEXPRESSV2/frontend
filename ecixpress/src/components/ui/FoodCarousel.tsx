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

const splitIntoColumns = (items: string[], cols: number): string[][] =>
    items.reduce<string[][]>(
        (acc, item, i) => {
          acc[i % cols].push(item);
          return acc;
        },
        Array.from({ length: cols }, () => [])
    );

interface ScrollColumnProps {
  images: string[];
  duration: number;   // segundos — columnas distintas a distinta velocidad
  reverse?: boolean;  // columna par sube, impar baja → más dinamismo
}

const ScrollColumn: React.FC<ScrollColumnProps> = ({ images, duration, reverse = false }) => {

  const looped = [...images, ...images];

  return (
      <div className="overflow-hidden flex-1">
        <div
            className="flex flex-col gap-3"
            style={{
              animation: `scroll-${reverse ? 'down' : 'up'} ${duration}s linear infinite`,
            }}
        >
          {looped.map((src, i) => (
              <div
                  key={`${src}-${i}`}
                  className="overflow-hidden rounded-xl shadow-md flex-shrink-0"
              >
                <img
                    src={src}
                    alt="food"
                    loading="lazy"
                    className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-110"

                    onError={(e) => {
                      const img = e.currentTarget;
                      img.src =
                          "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80";
                    }}

                />
              </div>
          ))}
        </div>
      </div>
  );
};

const FoodCarousel: React.FC = () => {
  const [col1, col2] = splitIntoColumns(IMAGES, 2);

  return (
      <>

        <div className="w-full h-full overflow-hidden rounded-2xl flex gap-3 p-4 ">
          <ScrollColumn images={col1} duration={20} />
          <ScrollColumn images={col2} duration={25} reverse />
        </div>
      </>
  );
};

export default FoodCarousel;