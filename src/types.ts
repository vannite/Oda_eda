export interface ProductWeight {
  weight: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  weights: ProductWeight[];
}

export interface CartItem extends Product {
  selectedWeight: ProductWeight;
  quantity: number;
}

export interface DeliveryOption {
  id: string;
  name: string;
  price: number;
  type: 'delivery' | 'pickup';
}
