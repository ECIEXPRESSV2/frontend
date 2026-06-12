interface Product {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  estimatedTime: string;
}

interface Store {
  id: number;
  name: string;
  imageUrl: string;
  rating: number;
  location: string;
  schedule: {
    weekdays: string;
    saturday: string;
  };
  products: Product[];
}

export const mockStores: Store[] = [
  {
    id: 1,
    name: 'Café Central',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop',
    rating: 4.8,
    location: 'Av. Principal 123, Centro',
    schedule: {
      weekdays: '7:00 - 20:00',
      saturday: '8:00 - 18:00'
    },
    products: [
      {
        id: 1,
        title: 'Cappuccino Italiano',
        description: 'Café espresso con leche espumada y un toque de cacao',
        imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&auto=format&fit=crop',
        price: 4.50,
        rating: 4.8,
        estimatedTime: '5 min'
      },
      {
        id: 2,
        title: 'Croissant de Almendra',
        description: 'Horneado fresco con relleno de crema de almendras',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop',
        price: 3.75,
        rating: 4.6,
        estimatedTime: '3 min'
      },
      {
        id: 3,
        title: 'Mocha Latte',
        description: 'Café con chocolate y leche espumada',
        imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop',
        price: 5.25,
        rating: 4.9,
        estimatedTime: '6 min'
      },
      {
        id: 4,
        title: 'Té Matcha Latte',
        description: 'Té verde japonés con leche y un toque de miel',
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop',
        price: 4.75,
        rating: 4.7,
        estimatedTime: '5 min'
      }
    ]
  },
  {
    id: 2,
    name: 'Pastelería Dulce',
    imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&auto=format&fit=crop',
    rating: 4.6,
    location: 'Calle 45 Norte 789',
    schedule: {
      weekdays: '8:00 - 19:00',
      saturday: '9:00 - 17:00'
    },
    products: [
      {
        id: 5,
        title: 'Tarta de Chocolate',
        description: 'Chocolate belga intenso con base crujiente',
        imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop',
        price: 6.50,
        rating: 4.9,
        estimatedTime: '10 min'
      },
      {
        id: 6,
        title: 'Macarons Assortment',
        description: 'Selección de 6 macarons de sabores variados',
        imageUrl: 'https://images.unsplash.com/photo-1569864358642-9d1684040f43?w=400&auto=format&fit=crop',
        price: 8.00,
        rating: 4.8,
        estimatedTime: '5 min'
      },
      {
        id: 7,
        title: 'Cheesecake NYC',
        description: 'Estilo New York con coulis de frutos rojos',
        imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&auto=format&fit=crop',
        price: 7.25,
        rating: 4.7,
        estimatedTime: '8 min'
      }
    ]
  },
  {
    id: 3,
    name: 'Sandwich Express',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop',
    rating: 4.5,
    location: 'Plaza Mayor 45',
    schedule: {
      weekdays: '11:00 - 22:00',
      saturday: '12:00 - 21:00'
    },
    products: [
      {
        id: 8,
        title: 'Sandwich Club',
        description: 'Pan tostado con pollo, bacon, lechuga y tomate',
        imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop',
        price: 8.50,
        rating: 4.7,
        estimatedTime: '8 min'
      },
      {
        id: 9,
        title: 'Bagel de Salmón',
        description: 'Bagel con cream cheese, salmón ahumado y alcaparras',
        imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400&auto=format&fit=crop',
        price: 9.00,
        rating: 4.6,
        estimatedTime: '10 min'
      },
      {
        id: 10,
        title: 'Wrap Mediterráneo',
        description: 'Tortilla con hummus, vegetales asados y queso feta',
        imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&auto=format&fit=crop',
        price: 7.75,
        rating: 4.5,
        estimatedTime: '7 min'
      }
    ]
  },
  {
    id: 4,
    name: 'Pizza Hut',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop',
    rating: 4.3,
    location: 'Boulevard 234',
    schedule: {
      weekdays: '12:00 - 23:00',
      saturday: '12:00 - 00:00'
    },
    products: [
      {
        id: 11,
        title: 'Pizza Pepperoni',
        description: 'Salsa de tomate, mozzarella y pepperoni',
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&auto=format&fit=crop',
        price: 12.00,
        rating: 4.5,
        estimatedTime: '15 min'
      },
      {
        id: 12,
        title: 'Pizza Margherita',
        description: 'Tomate fresco, mozzarella y albahaca',
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&auto=format&fit=crop',
        price: 11.50,
        rating: 4.4,
        estimatedTime: '12 min'
      },
      {
        id: 13,
        title: 'Pizza Hawaiana',
        description: 'Jamón, piña y mozzarella extra',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop',
        price: 13.00,
        rating: 4.3,
        estimatedTime: '15 min'
      }
    ]
  },
  {
    id: 5,
    name: 'Burger King',
    imageUrl: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&auto=format&fit=crop',
    rating: 4.4,
    location: 'Centro Comercial 567',
    schedule: {
      weekdays: '10:00 - 22:00',
      saturday: '11:00 - 23:00'
    },
    products: [
      {
        id: 14,
        title: 'Whopper',
        description: 'Hamburguesa con carne a la parrilla, lechuga, tomate y cebolla',
        imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop',
        price: 8.99,
        rating: 4.5,
        estimatedTime: '10 min'
      },
      {
        id: 15,
        title: 'Cheeseburger',
        description: 'Carne, queso cheddar, pepinillos y mostaza',
        imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&auto=format&fit=crop',
        price: 5.99,
        rating: 4.3,
        estimatedTime: '8 min'
      },
      {
        id: 16,
        title: 'Papas Fritas',
        description: 'Papas crujientes con sal',
        imageUrl: 'https://images.unsplash.com/photo-1573080496987-a199f8cd75c9?w=400&auto=format&fit=crop',
        price: 2.99,
        rating: 4.2,
        estimatedTime: '5 min'
      }
    ]
  }
];

export const getStoreById = (id: number): Store | undefined => {
  return mockStores.find(store => store.id === id);
};
