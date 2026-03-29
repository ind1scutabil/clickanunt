// Simple in-memory storage for development mode
// Use global to persist across Turbopack hot reloads
const globalForStorage = globalThis as unknown as { 
  listingsStorage?: Map<string, any>;
  initialized?: boolean;
};

if (!globalForStorage.listingsStorage) {
  globalForStorage.listingsStorage = new Map<string, any>();
  console.log('🗄️  Initialized memory storage');
  
  // Add sample listing for testing
  if (!globalForStorage.initialized) {
    const sampleListing = {
      id: 'listing-sample-bmw7',
      title: 'BMW Seria 7',
      category: 'Auto, moto și ambarcațiuni',
      subcategory: 'Autoturisme',
      priceAmount: 70000,
      priceCurrency: 'RON',
      condition: 'Folosit',
      description: 'BMW Seria 7 în stare excelentă, toate dotările, istoric complet service BMW.',
      county: 'București',
      city: 'Sector 1',
      photos: [],
      contactPhone: '+40 784 712 496',
      allowMessages: true,
      ownerUserId: 'owner-123',
      owner: {
        id: 'owner-123',
        email: 'owner@autoplatform.ro',
        name: 'Owner'
      },
      make: 'BMW',
      model: 'Seria 7',
      year: 2020,
      mileage: 50000,
      fuel: 'Diesel',
      transmission: 'Automatic',
      status: 'active',
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    globalForStorage.listingsStorage.set(sampleListing.id, sampleListing);
    globalForStorage.initialized = true;
    console.log('✅ Added sample BMW 7 listing:', sampleListing.id);
  }
}

const storage = globalForStorage.listingsStorage;

export const memoryStorage = {
  set: (key: string, value: any) => {
    storage.set(key, value);
    console.log(`💾 Saved listing: ${key}`);
  },
  get: (key: string) => {
    const value = storage.get(key);
    console.log(`📖 Get listing: ${key} - ${value ? 'FOUND' : 'NOT FOUND'}`);
    return value;
  },
  has: (key: string) => storage.has(key),
  delete: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
  getAll: () => Array.from(storage.values())
};
