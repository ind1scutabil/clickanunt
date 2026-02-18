/**
 * Car Makes With Logos - Enterprise Database
 * Minimal stub to avoid build errors
 */

const modelsData: Record<string, string[]> = {
  'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7'],
  'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series', '7 Series', 'X1', 'X3', 'X5', 'X7'],
  'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLC', 'GLE', 'GLS'],
  'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Touareg', 'Jetta', 'Beetle'],
  'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera'],
  'Tesla': ['Model S', 'Model 3', 'Model X', 'Model Y'],
  'Toyota': ['Corolla', 'Camry', 'Prius', 'RAV4', 'Highlander', 'Land Cruiser'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey'],
  'Nissan': ['Altima', 'Maxima', 'Qashqai', 'Murano', 'Pathfinder'],
  'Hyundai': ['i10', 'i20', 'i30', 'i40', 'Santa Fe', 'Tucson'],
  'Kia': ['Picanto', 'Ceed', 'Sportage', 'Sorento'],
  'Volvo': ['S60', 'S90', 'V60', 'XC40', 'XC60', 'XC90'],
  'Skoda': ['Fabia', 'Octavia', 'Superb', 'Karoq'],
  'Fiat': ['500', 'Panda', 'Tipo', 'Punto'],
  'Renault': ['Clio', 'Megane', 'Scenic', 'Duster'],
  'Peugeot': ['208', '308', '3008', '5008'],
  'Citroen': ['C1', 'C3', 'C5', 'Berlingo'],
  'Ford': ['Focus', 'Fiesta', 'Fusion', 'Mustang', 'F-150'],
  'Chevrolet': ['Silverado', 'Malibu', 'Equinox', 'Traverse'],
  'GMC': ['Sierra', 'Acadia', 'Yukon', 'Terrain'],
};

export interface CarMake {
  id: string;
  name: string;
  country: string;
  models: string[];
  featured?: boolean;
}

export const PREMIUM_CAR_MAKES: CarMake[] = [
  { id: 'audi', name: 'Audi', country: 'Germany', models: modelsData['Audi'], featured: true },
  { id: 'bmw', name: 'BMW', country: 'Germany', models: modelsData['BMW'], featured: true },
  { id: 'mercedes', name: 'Mercedes-Benz', country: 'Germany', models: modelsData['Mercedes-Benz'], featured: true },
  { id: 'volkswagen', name: 'Volkswagen', country: 'Germany', models: modelsData['Volkswagen'], featured: true },
  { id: 'porsche', name: 'Porsche', country: 'Germany', models: modelsData['Porsche'] },
  { id: 'tesla', name: 'Tesla', country: 'USA', models: modelsData['Tesla'], featured: true },
  { id: 'toyota', name: 'Toyota', country: 'Japan', models: modelsData['Toyota'], featured: true },
  { id: 'honda', name: 'Honda', country: 'Japan', models: modelsData['Honda'], featured: true },
  { id: 'nissan', name: 'Nissan', country: 'Japan', models: modelsData['Nissan'], featured: true },
  { id: 'hyundai', name: 'Hyundai', country: 'South Korea', models: modelsData['Hyundai'], featured: true },
  { id: 'kia', name: 'Kia', country: 'South Korea', models: modelsData['Kia'], featured: true },
  { id: 'volvo', name: 'Volvo', country: 'Sweden', models: modelsData['Volvo'] },
  { id: 'skoda', name: 'Skoda', country: 'Czech Republic', models: modelsData['Skoda'], featured: true },
  { id: 'fiat', name: 'Fiat', country: 'Italy', models: modelsData['Fiat'], featured: true },
  { id: 'renault', name: 'Renault', country: 'France', models: modelsData['Renault'], featured: true },
  { id: 'peugeot', name: 'Peugeot', country: 'France', models: modelsData['Peugeot'], featured: true },
  { id: 'citroen', name: 'Citroen', country: 'France', models: modelsData['Citroen'], featured: true },
  { id: 'ford', name: 'Ford', country: 'USA', models: modelsData['Ford'], featured: true },
  { id: 'chevrolet', name: 'Chevrolet', country: 'USA', models: modelsData['Chevrolet'] },
  { id: 'gmc', name: 'GMC', country: 'USA', models: modelsData['GMC'] },
];

export function getModelsByMake(make: string): string[] {
  return modelsData[make] || [];
}

export function getAllBrandNames(): string[] {
  return PREMIUM_CAR_MAKES.map(m => m.name);
}
