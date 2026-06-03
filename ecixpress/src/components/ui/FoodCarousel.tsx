
const images = [
  "https://images.unsplash.com/photo-1604908176997-4316c288032e", // arroz + pollo
  "https://images.unsplash.com/photo-1600891964599-f61ba0e24092", // comida casera completa
  "https://images.unsplash.com/photo-1617196034183-421b4917c92d", // arroz, carne, ensalada
  "https://images.unsplash.com/photo-1594007654729-407eedc4be65", // almuerzo típico
  "https://images.unsplash.com/photo-1625944196264-9b56cf2c82c5", // comida latina
  "https://images.unsplash.com/photo-1627308595171-d1b5d67129c4", // plato con arroz
  "https://images.unsplash.com/photo-1562967916-eb82221dfb92", // comida casera simple
  "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af",
  "https://images.unsplash.com/photo-1604908176997-4316c288032e", // arroz pollo
  "https://images.unsplash.com/photo-1600891964599-f61ba0e24092", // comida mesa
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38", // pizza real
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1", // hamburguesa
  "https://images.unsplash.com/photo-1594007654729-407eedc4be65", // plato diario
  "https://images.unsplash.com/photo-1627308595171-d1b5d67129c4", // arroz+proteína
  "https://images.unsplash.com/photo-1617196034183-421b4917c92d", // almuerzo típico
  "https://images.unsplash.com/photo-1550547660-d9450f859349", // burger casera
  "https://images.unsplash.com/photo-1601924582975-7e1e89c5b45c", // pasta normal
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836", // comida familiar
  "https://images.unsplash.com/photo-1528716321680-815a8cdb8cbe", // pollo
// carne + arroz
];


const FoodCarousel = () => {
  const loopImages = [...images, ...images];

  return (
      <div className="h-[600px] w-full overflow-hidden rounded-2xl bg-neutral-100">
        <div className="animate-scroll grid grid-cols-2 gap-4 p-4">
          {loopImages.map((src, i) => (
              <div
                  key={i}
                  className="overflow-hidden rounded-xl shadow-lg hover:scale-105 transition-transform duration-300"
              >
                <img
                    src={`${src}?w=500&auto=format&fit=crop&q=80`}
                    className="w-full h-48 object-cover"
                    alt="food"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&auto=format&fit=crop&q=80";
                    }}

                    loading="lazy"

                />
              </div>
          ))}
        </div>
      </div>
  );
};


export default FoodCarousel;