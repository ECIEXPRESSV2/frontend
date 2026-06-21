import React from 'react';

const IMAGES = [
  "https://images.unsplash.com/photo-1604908176997-4316c288032e?w=400&q=80",
  "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400&q=80",
  "https://images.unsplash.com/photo-1617196034183-421b4917c92d?w=400&q=80",
  "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&q=80",
  "https://images.unsplash.com/photo-1625944196264-9b56cf2c82c5?w=400&q=80",
  "https://images.unsplash.com/photo-1627308595171-d1b5d67129c4?w=400&q=80",
  "https://images.unsplash.com/photo-1562967916-eb82221dfb92?w=400&q=80",
  "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=400&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80",
  "https://images.unsplash.com/photo-1601924582975-7e1e89c5b45c?w=400&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  "https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe?w=400&q=80",
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