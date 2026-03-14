import Papa from 'papaparse';
import { Product, DeliveryOption } from '../types';

const SHEET_ID = '1oXwz2zznkpY10M5GumIET6E96TjEEMd3jISM4FUy2f0';
const PRODUCTS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const DELIVERY_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1630132333`;

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch(PRODUCTS_URL);
    const csvData = await response.text();
    const results = Papa.parse(csvData, { header: true });
    
    const products: Product[] = [];
    let currentProduct: Product | null = null;

    results.data.forEach((row: any, index: number) => {
      const name = row['Наименование']?.trim();
      const photo = row['Фото']?.trim();
      const weight = row['Вес в гр']?.trim();
      const price = parseFloat(row['Цена']?.replace(/[^\d.]/g, '') || '0');

      if (name && photo) {
        // New product
        currentProduct = {
          id: `prod-${index}`,
          name: name,
          description: '', 
          image: photo,
          weights: [{ weight, price }]
        };
        products.push(currentProduct);
      } else if (currentProduct && weight && price) {
        // Additional weight for current product
        currentProduct.weights.push({ weight, price });
      }
    });

    return products;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export async function fetchDeliveryOptions(): Promise<DeliveryOption[]> {
  try {
    const response = await fetch(DELIVERY_URL);
    const csvData = await response.text();
    const results = Papa.parse(csvData, { header: true });
    
    return results.data
      .filter((row: any) => row['Наименование'] && row['Цена'])
      .map((row: any, index: number) => ({
        id: `delivery-${index}`,
        name: row['Наименование']?.trim(),
        price: parseFloat(row['Цена']?.replace(/[^\d.]/g, '') || '0'),
        type: row['Тип']?.trim().toLowerCase() === 'самовывоз' ? 'pickup' : 'delivery'
      }));
  } catch (error) {
    console.error('Error fetching delivery options:', error);
    return [
      { id: 'default-office', name: 'До офиса', price: 75, type: 'delivery' },
      { id: 'default-pickup', name: 'Самовывоз', price: 0, type: 'pickup' }
    ];
  }
}
