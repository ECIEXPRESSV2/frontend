export interface Product {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  estimatedTime: string;
}

export interface Store {
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
