'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import { memoryStorage } from '@/lib/memory-storage';
import { getCsrfToken } from '@/lib/security/csrf-client';
import { CarSelectorPro } from '@/app/components/CarSelectorPro';

// Legacy car models for reference - now using new enterprise database
const carModels: Record<string, string[]> = {
  "Alfa Romeo": ["4C", "Alfetta", "Arna", "Giulia", "Giulietta", "GT", "GTV", "MiTo", "Spider", "Stelvio", "Tonale", "Ypsilon"],
  "Aston Martin": ["DB4", "DB5", "DB9", "DB11", "DB12", "DBX", "Rapide", "Vantage", "Vanquish"],
  "Audi": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4", "Q5", "Q7", "R8", "TT", "RS3", "RS4", "RS5", "e-tron"],
  "BMW": ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "i3", "i4", "X1", "X2", "X3", "X4", "X5", "X6", "Z4"],
  "Bentley": ["Bentayga", "Continental", "Flying Spur", "Mulsanne"],
  "BYD": ["Atto 3", "Dolphin", "Song", "Qin", "Yuan"],
  "Bugatti": ["Chiron", "Veyron"],
  "Cadillac": ["CTS", "CT5", "CT6", "Escalade", "Lyriq"],
  "Changan": ["CS35", "CS55", "CS75", "Eado"],
  "Chevrolet": ["Blazer", "Bolt", "Camaro", "Cavalier", "Colorado", "Corvette", "Cruze", "Equinox", "Impala", "Malibu", "Silverado", "Sonic", "Spark", "Tahoe", "TrailBlazer", "Trax", "Traverse"],
  "Chrysler": ["300", "Pacifica", "PT Cruiser"],
  "Citroën": ["C1", "C2", "C3", "C4", "C5", "C-Elysée", "Berlingo", "Saxo", "ZX"],
  "Dacia": ["Duster", "Logan", "Sandero", "Spring"],
  "Daewoo": ["Kalos", "Lanos", "Matiz", "Nexia", "Nubira"],
  "Daihatsu": ["Charade", "Copen", "Feroza", "Mira", "Move", "Rocky", "Terios"],
  "Dodge": ["Charger", "Challenger", "Dakota", "Durango", "Neon", "Ram", "Viper"],
  "DS": ["DS3", "DS4", "DS5", "DS7", "DS9"],
  "Ferrari": ["250 GT", "288 GTO", "308 GTB", "360 Modena", "430 Scuderia", "458 Italia", "488 GTB", "F40", "F50", "FF", "Roma", "SF90"],
  "Fiat": ["127", "500", "500C", "500L", "500X", "Bravo", "Ducato", "Idea", "Linea", "Panda", "Palio", "Punto", "Seicento", "Tipo", "Uno"],
  "Ford": ["Bronco", "EcoSport", "Edge", "Escape", "Explorer", "Fiesta", "Focus", "Fusion", "Kuga", "Mondeo", "Mustang", "Ranger", "S-Max", "Taurus", "Transit"],
  "Geely": ["Coolray", "Emgrand", "Geometry", "Monjaro", "Vision"],
  "Genesis": ["G60", "G70", "G80", "G90", "GV60", "GV70", "GV80"],
  "GMC": ["Acadia", "Canyon", "Denali", "Sierra", "Terrain", "Yukon"],
  "Great Wall": ["Haval H1", "Haval H2", "Haval H3", "Haval H4", "Haval H5", "Haval H6", "Haval H7", "Haval H8", "Haval H9", "Jolion", "Ora", "Wey VV5", "Wey VV6", "Wey VV7"],
  "Honda": ["Accord", "Civic", "CR-V", "Fit", "HR-V", "Jazz", "Legend", "Odyssey", "Pilot", "Ridgeline"],
  "Hyundai": ["Accent", "Avante", "Creta", "Elantra", "Getz", "Grand Santa Fe", "i10", "i20", "i30", "Ioniq", "Kona", "MatRix", "Santa Fe", "Sonata", "Teleport", "Tiburon", "Tucson", "Venue", "Verna"],
  "Infiniti": ["EX35", "FX35", "G35", "G37", "JX35", "M35", "Q45", "Q50", "Q60", "Q70", "QX50", "QX60", "QX80"],
  "Isuzu": ["D-Max", "Faster", "Gemini", "I-Mark", "MU-X", "Piazza", "Rodeo", "Trooper", "Wizard"],
  "Jaguar": ["E-Type", "E-Pace", "F-Pace", "F-Type", "I-Pace", "S-Type", "XE", "XF", "XJ", "XK"],
  "Jeep": ["Cherokee", "Compass", "Gladiator", "Grand Cherokee", "Patriot", "Renegade", "Wrangler"],
  "Kia": ["Carnival", "Ceed", "Cerato", "EV6", "Forte", "K5", "Kona", "K9", "Niro", "Optima", "Picanto", "Rondo", "Sorento", "Soul", "Sportage", "Stinger", "Telluride"],
  "Lamborghini": ["Countach", "Diablo", "Espada", "Gallardo", "Huracán", "Murciélago", "Reventon", "Urus", "Veneno"],
  "Lancia": ["Beta", "Dedra", "Delta", "Ypsilon"],
  "Land Rover": ["Defender", "Discovery", "Discovery Sport", "Freelander", "Range Rover", "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar"],
  "Lexus": ["CT", "ES", "GS", "GX", "IS", "LFA", "LS", "LX", "NX", "RC", "RX", "RZ", "UX"],
  "Li Auto": ["Air", "EX6", "EX8", "One", "Zhijie"],
  "Lincoln": ["Aviator", "Continental", "Corsair", "LS", "MKC", "MKZ", "Navigator", "Town Car"],
  "Lotus": ["Eclat", "Elite", "Emira", "Europa", "Evija", "Exige", "Esprit", "Evora"],
  "Mahindra": ["Bolero", "KUV100", "Marazzo", "Thar", "XUV300", "XUV500", "XUV700"],
  "Maserati": ["3200 GT", "Ghibli", "Granturismo", "Indy", "Khamsin", "Levante", "MC12", "MC20", "Quattroporte"],
  "Mazda": ["2", "3", "5", "6", "CX-3", "CX-30", "CX-5", "CX-8", "CX-9", "MX-5", "RX-8"],
  "McLaren": ["540C", "570GT", "570S", "600LT", "650S", "720S", "750S", "765LT", "GT", "MP4-12C", "P1", "Senna", "Speedtail", "Elva"],
  "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "CLA", "CLS", "E-Class", "G-Class", "GLA", "GLB", "GLC", "GLE", "GLS", "S-Class", "SL", "SLC", "SLK"],
  "MG": ["3", "4", "5", "6", "7", "GT", "HS", "MG4", "MG5", "RX5", "RX8", "ZS"],
  "Mini": ["Clubman", "Convertible", "Cooper", "Countryman", "Hatch", "Rocketman"],
  "Mitsubishi": ["3000GT", "ASX", "Attrage", "Colt", "Eclipse", "Eclipse Cross", "Galant", "Lancer", "Lancer Evo", "Montero", "Mirage", "Outlander", "Outlander PHEV", "Pajero", "Space Star", "Strada", "Triton"],
  "Nissan": ["Almera", "Altima", "Ariya", "Armada", "Cube", "Frontier", "GT-R", "Juke", "Kicks", "Maxima", "Murano", "Navara", "Pathfinder", "Pulsar", "Qashqai", "Rogue", "Sentra", "Skyline", "X-Trail"],
  "Opel": ["Astra", "Calibra", "Cascada", "Corsa", "Grandland", "Insignia", "Manta", "Mokka", "Vectra", "Vivaro"],
  "Peugeot": ["107", "108", "207", "208", "307", "308", "407", "408", "508", "2008", "3008", "4007", "5008", "Partner", "RCZ"],
  "Porsche": ["356", "911", "914", "924", "944", "968", "Boxster", "Cayman", "Cayenne", "Macan", "Panamera", "Taycan"],
  "RAM": ["1500", "2500", "3500", "Promaster"],
  "Renault": ["5", "Captur", "Clio", "Espace", "Fluence", "Kangoo", "Laguna", "Master", "Megane", "Scenic", "Talisman", "Twingo", "Zoe"],
  "Rolls-Royce": ["Cutlass", "Dawn", "Ghost", "Phantom", "Silver Cloud", "Silver Shadow", "Wraith"],
  "Seat": ["Alhambra", "Arona", "Ateca", "Cordoba", "Ibiza", "Leon", "Tarraco", "Toledo"],
  "Skoda": ["Citigo", "Fabia", "Felicia", "Forman", "Karoq", "Kodiaq", "Octavia", "Rapid", "Superb", "Yeti"],
  "Subaru": ["BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "SVX", "WRX", "XV"],
  "Suzuki": ["Aerio", "Alto", "Grand Vitara", "Ignis", "Jimny", "Kei", "Liana", "Samurai", "Splash", "Swift", "SX4", "Vitara", "Wagon R"],
  "Tata": ["Indica", "Nano", "Safari", "Sumo"],
  "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Roadster"],
  "Toyota": ["4Runner", "Auris", "Avensis", "Aygo", "Camry", "Celica", "Chaser", "Corolla", "Corona", "Cresta", "Cressida", "FJ Cruiser", "Fortuner", "Glanza", "GR Supra", "Highlander", "Hilux", "iQ", "Innova", "Land Cruiser", "LandCruiser Prado", "Mark II", "Matrix", "MR2", "Paseo", "Previa", "Prius", "RAV4", "Roomy", "Runner", "Scepter", "Sequoia", "Sienna", "Starlet", "Supra", "Tacoma", "Tercel", "Tundra", "Verso", "Vios", "Yaris"],
  "Volkswagen": ["Beetle", "Bora", "Caddy", "Corrado", "Crafter", "Down", "Eos", "Gol", "Golf", "Golf Plug-in Hybrid", "Jetta", "Karmann Ghia", "Lupo", "Passat", "Phaeton", "Polo", "Rabbit", "Routan", "Scirocco", "Sharan", "Tiguan", "Touareg", "Touran", "Transporter", "Type 1", "Type 2", "Vento"],
  "Volvo": ["240", "740", "760", "850", "900", "C30", "C40", "C60", "C70", "C90", "S40", "S60", "S70", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90"],
  "Xpeng": ["G3", "G6", "G9", "P7", "P8"],
  "Zada": [],
};

const romanianCounties: Record<string, string[]> = {
  "Alba": ["Alba Iulia", "Aiud", "Blaj", "Sebeș", "Vintu de Jos", "Cugir"],
  "Arad": ["Arad", "Lipova", "Nădlac", "Pâncota", "Curtici", "Șeitin"],
  "Argeș": ["Pitești", "Câmpulung", "Curtea de Argeș", "Mioveni", "Costești", "Urziceni"],
  "Bacău": ["Bacău", "Onești", "Moinești", "Boldu", "Piatra Neamț", "Comănești"],
  "Bihor": ["Oradea", "Salonta", "Marghita", "Beiuș", "Valea lui Mihai", "Ștei"],
  "Bistrița-Năsăud": ["Bistrița", "Năsăud", "Beclean", "Sălsig", "Prundu Bârgăului", "Rebra"],
  "Botoșani": ["Botoșani", "Dorohoi", "Bucecea", "Flămânzi", "Săveni", "Cristinești"],
  "Brașov": ["Brașov", "Făgăraș", "Săcele", "Codlea", "Tescani", "Zizin"],
  "Brăila": ["Brăila", "Galați", "Ianca", "Vâlcani", "Movila", "Insurăței"],
  "Buzău": ["Buzău", "Râmnicu Sărat", "Pătârlagele", "Pogoanele", "Mânzu", "Nehoiu"],
  "Caraș-Severin": ["Reșița", "Oțelu Roșu", "Anina", "Moldova Nouă", "Băile Herculane", "Socol"],
  "Constanța": ["Constanța", "Mangalia", "Medgidia", "Cernavodă", "Hârșova", "Ovidiu"],
  "Covasna": ["Sfântu Gheorghe", "Târgu Secuiesc", "Odorheiu Secuiesc", "Baraolt", "Brețcu", "Întorsura Buzăului"],
  "Dâmbovița": ["Târgoviște", "Gaești", "Moreni", "Răcari", "Titu", "Pucioasa"],
  "Dolj": ["Craiova", "Băilești", "Calafat", "Segarcea", "Bechet", "Filiași"],
  "Donău": ["Tulcea", "Măcin", "Babadag", "Isaccea", "Sulina", "Crișan"],
  "Galați": ["Galați", "Tecuci", "Niculești", "Bujoreni", "Schela", "Ivești"],
  "Giurgiu": ["Giurgiu", "Bolintin Vale", "Stoenești", "Băneasa", "Filipeștii de Sus", "Ieșcani"],
  "Gorj": ["Târgu Jiu", "Motru", "Târgu Cărbunești", "Bumbești-Jiu", "Rovinari", "Dragotești"],
  "Harghita": ["Miercurea Ciuc", "Odorheiu Secuiesc", "Gheorgheni", "Toplița", "Cristuru Secuiesc", "Bălan"],
  "Hunedoara": ["Deva", "Hunedoara", "Petroșani", "Lupeni", "Vulcan", "Ghelari"],
  "Ialomița": ["Slobozia", "Fetești", "Fierbinți-Târg", "Țăndărei", "Borcea", "Amara"],
  "Iași": ["Iași", "Pașcani", "Tiraspol", "Târgu Frumos", "Hârlău", "Moinești"],
  "Ilfov": ["Buftea", "Voluntari", "Bragadiru", "Olănești", "Chitila", "Popești-Leordeni"],
  "Maramureș": ["Baia Mare", "Satu Mare", "Borșa", "Vișeu de Sus", "Negrești-Oaș", "Seini"],
  "Mehedinți": ["Drobeta-Turnu Severin", "Orsova", "Strehaia", "Vânjiu", "Eselnita", "Bujoreni"],
  "Mureș": ["Târgu Mureș", "Sighișoara", "Reghin", "Odorheiu Secuiesc", "Luduș", "Cristuru Secuiesc"],
  "Neamț": ["Piatra Neamț", "Roman", "Săveni", "Târgu Neamț", "Bârsești", "Negrești"],
  "Olt": ["Slatina", "Călimănești", "Băilești", "Caracal", "Potcoava", "Corabia"],
  "Prahova": ["Ploiești", "Băicoi", "Câmpina", "Mizil", "Breaza", "Vălenii de Munte"],
  "Sălaj": ["Zalau", "Jibou", "Șimleu Silvaniei", "Cehu Silvaniei", "Peri", "Creaca"],
  "Satu Mare": ["Satu Mare", "Carei", "Negrești-Oaș", "Tirol", "Tăşnad", "Apa"],
  "Sibiu": ["Sibiu", "Mediaș", "Cisnădie", "Avrig", "Săliște", "Copșa Mică"],
  "Suceava": ["Suceava", "Radăuți", "Fălticeni", "Vatra Moldoviței", "Gura Humorului", "Câmpulung Moldovenesc"],
  "Teleorman": ["Alexandria", "Turnu Măgurele", "Videle", "Roșiori de Vede", "Pitești", "Svistov"],
  "Timiș": ["Timișoara", "Lugoj", "Caransebeș", "Jimbee", "Deta", "Măcova"],
  "Tulcea": ["Tulcea", "Măcin", "Babadag", "Isaccea", "Sulina", "Crișan"],
  "Vâlcea": ["Râmnicu Vâlcea", "Călimănești", "Băile Olănești", "Drăgășani", "Călimănești", "Băile Govora"],
  "Vaslui": ["Vaslui", "Bârlad", "Negrești", "Murgeni", "Belești", "Ivești"],
  "Vrancea": ["Focșani", "Adjud", "Odobești", "Jariștea", "Vulturu", "Gherța"],
};

const normalizeCondition = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Nou: 'new',
    Folosit: 'used',
    'Recondiționat': 'refurbished',
    'Pentru piese': 'for_parts',
  };
  return map[value] || value;
};

const normalizeFuel = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Benzina: 'petrol',
    'Benzină': 'petrol',
    Diesel: 'diesel',
    Motorina: 'diesel',
    'Motorină': 'diesel',
    Electric: 'electric',
    Hybrid: 'hybrid',
    Hibrid: 'hybrid',
    LPG: 'lpg',
    GPL: 'lpg',
    CNG: 'gas',
    Gaz: 'gas',
  };
  return map[value] || value;
};

const normalizeTransmission = (value?: string) => {
  if (!value) return '';
  const map: Record<string, string> = {
    Manual: 'manual',
    'Manuală': 'manual',
    Automata: 'automatic',
    'Automată': 'automatic',
    Semiautomata: 'automatic',
    'Semiautomată': 'automatic',
    CVT: 'automatic',
  };
  return map[value] || value;
};

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subcategory: '',
    priceAmount: 0,
    priceCurrency: 'RON',
    condition: '',
    description: '',
    county: '',
    city: '',
    contactPhone: '',
    make: '',
    model: '',
    year: 0,
    mileage: 0,
    fuel: '',
    transmission: '',
    vin: '',
    attributes: {} as any
  });

  const canRepublish = ['paused', 'hidden', 'rejected', 'pending'].includes(String(listing?.status || '').toLowerCase());

  useEffect(() => {
    const loadListing = async () => {
      try {
        const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';
        
        if (useInMemory) {
          const data = memoryStorage.get(id);
          if (data) {
            setListing(data);
            setFormData({
              title: data.title || '',
              category: data.category || '',
              subcategory: data.subcategory || '',
              priceAmount: data.priceAmount || 0,
              priceCurrency: data.priceCurrency || 'RON',
              condition: normalizeCondition(data.condition || ''),
              description: data.description || '',
              county: data.county || '',
              city: data.city || '',
              contactPhone: data.contactPhone || '',
              make: data.make || '',
              model: data.model || '',
              year: data.year || 0,
              mileage: data.mileage || 0,
              fuel: normalizeFuel(data.fuel || ''),
              transmission: normalizeTransmission(data.transmission || ''),
              vin: data.vin || '',
              attributes: data.attributes || {}
            });
          }
        } else {
          // Production: fetch from API
          const token = localStorage.getItem('accessToken');
          const response = await fetch(`/api/listings/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            console.error('Failed to load listing:', response.status);
            setListing(null);
            setLoading(false);
            return;
          }

          const data = await response.json();
          setListing(data);
          setFormData({
            title: data.title || '',
            category: data.category || '',
            subcategory: data.subcategory || '',
            priceAmount: data.priceAmount || 0,
            priceCurrency: data.priceCurrency || 'RON',
            condition: normalizeCondition(data.condition || ''),
            description: data.description || '',
            county: data.county || '',
            city: data.city || '',
            contactPhone: data.contactPhone || '',
            make: data.make || '',
            model: data.model || '',
            year: data.year || 0,
            mileage: data.mileage || 0,
            fuel: normalizeFuel(data.fuel || ''),
            transmission: normalizeTransmission(data.transmission || ''),
            vin: data.vin || '',
            attributes: data.attributes || {}
          });
        }
      } catch (error) {
        console.error('Error loading listing:', error);
        setListing(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadListing();
    }
  }, [id]);

  const handleSave = async (requestRepublish = false) => {
    setSaving(true);
    try {
      if (!formData.title.trim() || formData.title.trim().length < 5) {
        setNotification({ message: 'Titlul trebuie să aibă minim 5 caractere.', type: 'error' });
        setSaving(false);
        return;
      }

      if (!formData.category.trim()) {
        setNotification({ message: 'Categoria este obligatorie pentru salvare.', type: 'error' });
        setSaving(false);
        return;
      }

      const payload: Record<string, unknown> = {
        ...formData,
        title: formData.title.trim(),
        category: formData.category.trim(),
        subcategory: formData.subcategory.trim() || null,
        description: formData.description.trim() || null,
        county: formData.county.trim() || null,
        city: formData.city.trim() || null,
        contactPhone: formData.contactPhone.trim() || null,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        vin: formData.vin.trim() || null,
        year: Number.isFinite(formData.year) && formData.year >= 1900 ? formData.year : null,
        fuel: ['petrol', 'diesel', 'hybrid', 'electric', 'lpg', 'gas'].includes(String(formData.fuel))
          ? formData.fuel
          : null,
        transmission: ['manual', 'automatic'].includes(String(formData.transmission))
          ? formData.transmission
          : null,
      };
      if (requestRepublish) payload.status = 'pending';

      const useInMemory = process.env.NEXT_PUBLIC_USE_IN_MEMORY_DB === 'true';

      if (useInMemory) {
        memoryStorage.set(id, payload);
        setNotification({ message: 'Anunț salvat cu succes!', type: 'success' });
      } else {
        const token = localStorage.getItem('accessToken');
        const csrfToken = await getCsrfToken();
        const response = await fetch(`/api/listings/${id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'Eroare la salvare');
        }

        setNotification({
          message: requestRepublish
            ? 'Anunțul a fost trimis la moderare.'
            : canRepublish
            ? 'Modificările au fost salvate. Acum apasă "Salvează și trimite la reverificare".'
            : 'Anunț salvat cu succes!',
          type: 'success'
        });
      }

      // For suspended/rejected listings, keep user on page after plain save
      // so they can explicitly send the listing back to moderation.
      if (!canRepublish || requestRepublish) {
        setTimeout(() => {
          router.push(`/listings/${id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving listing:', error);
      setNotification({ message: error instanceof Error ? error.message : 'Eroare la salvare', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/listings/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-400">Se încarcă...</div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-400">Anunț nu găsit</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Editează Anunț</h1>
            <p className="text-gray-400">Actualizează detaliile anunțului tău</p>
          </div>

          {notification && (
            <div className={`mb-6 p-4 rounded-lg text-white ${notification.type === 'success' ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'}`}>
              {notification.message}
            </div>
          )}

          {canRepublish && (
            <div className="mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-900/20">
              <p className="text-amber-200 font-semibold mb-1">Anunț suspendat sau respins de moderare</p>
              <p className="text-amber-100/90 text-sm">
                După ce faci modificările necesare, folosește butonul „Salvează și trimite la reverificare”.
              </p>
              {listing?.moderationNotes ? (
                <p className="mt-2 text-sm text-amber-100"><span className="font-semibold">Motiv:</span> {listing.moderationNotes}</p>
              ) : null}
            </div>
          )}

          <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4E3CFF]/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 rounded-2xl border-2 border-gradient-to-br from-[#4E3CFF]/10 to-transparent pointer-events-none" />

            {/* Detalii Anunț */}
            <div className="relative z-10 space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Informații Generale</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Titlu
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: BMW 320d, anul 2015"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Categorie
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează categorie</option>
                      <option value="Automobile">Automobile</option>
                      <option value="Motociclete">Motociclete</option>
                      <option value="Piese">Piese Auto</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Subcategorie
                    </label>
                    <input
                      type="text"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: Sedane, SUV, Coupe"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Stare
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează stare</option>
                      <option value="new">Nou</option>
                      <option value="used">Folosit</option>
                      <option value="refurbished">Recondiționat</option>
                      <option value="for_parts">Pentru piese</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Prețul */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Preț</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Preț
                    </label>
                    <input
                      type="number"
                      value={formData.priceAmount}
                      onChange={(e) => setFormData({ ...formData, priceAmount: parseFloat(e.target.value) })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="0"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Monedă
                    </label>
                    <select
                      value={formData.priceCurrency}
                      onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="RON">RON</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mașină */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Detalii Mașină</h2>
                
                {/* Professional Car Selector - ENTERPRISE GRADE */}
                <div className="mb-6">
                  <CarSelectorPro
                    selectedMake={formData.make}
                    selectedModel={formData.model}
                    onSelectMake={(make) => setFormData(prev => ({ ...prev, make, model: '' }))}
                    onSelectModel={(model) => setFormData(prev => ({ ...prev, model }))}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      An fabricație
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="2020"
                    />
                  </div>
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Kilometraj
                    </label>
                    <input
                      type="number"
                      value={formData.mileage}
                      onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="50000 km"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Combustibil
                    </label>
                    <select
                      value={formData.fuel}
                      onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="petrol">⛽ Benzină</option>
                      <option value="diesel">🛢️ Diesel</option>
                      <option value="electric">⚡ Electric</option>
                      <option value="hybrid">🔋 Hibrid</option>
                      <option value="lpg">💨 GPL</option>
                      <option value="gas">💨 CNG/Gaz</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Transmisie
                    </label>
                    <select
                      value={formData.transmission}
                      onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="manual">🎛️ Manuală</option>
                      <option value="automatic">⚙️ Automată</option>
                    </select>
                  </div>
                </div>

                {/* Comprehensive Technical Details - Auto1 Style */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🚙 Caroserie
                    </label>
                    <select
                      value={formData.attributes?.bodyType || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, bodyType: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Hatchback">Hatchback</option>
                      <option value="SUV">SUV</option>
                      <option value="Coupe">Coupe</option>
                      <option value="Cabrio">Cabrio/Convertibil</option>
                      <option value="Break">Break/Combi</option>
                      <option value="Monovolum">Monovolum/MPV</option>
                      <option value="Pick-up">Pick-up</option>
                      <option value="Van">Van/Utilitară</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      📆 Prima înmatriculare
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.firstRegistration || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, firstRegistration: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 02/2020"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔖 VIN (Cod șasiu)
                    </label>
                    <input
                      type="text"
                      value={formData.vin || ''}
                      onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600 font-mono"
                      placeholder="17 caractere"
                      maxLength={17}
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🐎 Putere (CP)
                    </label>
                    <input
                      type="number"
                      value={formData.attributes?.horsePower || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, horsePower: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="130"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔧 Capacitate cilindrică (cm³)
                    </label>
                    <input
                      type="number"
                      value={formData.attributes?.engineCapacity || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, engineCapacity: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="1995"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔄 Tracțiune
                    </label>
                    <select
                      value={formData.attributes?.drivetrain || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, drivetrain: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Față">Față (FWD)</option>
                      <option value="Spate">Spate (RWD)</option>
                      <option value="Integrală">Integrală (4WD/AWD)</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🎨 Culoare exterioară
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.color || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, color: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: Albastru metalic"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🪑 Tapițerie
                    </label>
                    <select
                      value={formData.attributes?.upholstery || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, upholstery: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Textil">Textil</option>
                      <option value="Piele">Piele</option>
                      <option value="Piele parțială">Piele parțială</option>
                      <option value="Alcantara">Alcantara</option>
                      <option value="Velur">Velur</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🚪 Număr uși
                    </label>
                    <select
                      value={formData.attributes?.doors || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, doors: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="2">2 uși</option>
                      <option value="3">3 uși</option>
                      <option value="4">4 uși</option>
                      <option value="5">5 uși</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      💺 Număr locuri
                    </label>
                    <select
                      value={formData.attributes?.seats || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, seats: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="2">2 locuri</option>
                      <option value="4">4 locuri</option>
                      <option value="5">5 locuri</option>
                      <option value="7">7 locuri</option>
                      <option value="9">9 locuri</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      👥 Număr proprietari anteriori
                    </label>
                    <input
                      type="number"
                      value={formData.attributes?.owners || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, owners: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 2"
                      min="0"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🔑 Număr chei disponibile
                    </label>
                    <select
                      value={formData.attributes?.keys || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, keys: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="1">1 cheie</option>
                      <option value="2">2 chei</option>
                      <option value="3">3+ chei</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      ⚠️ Daune/Accidente anterioare
                    </label>
                    <select
                      value={formData.attributes?.priorDamage || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, priorDamage: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Nu">Nu</option>
                      <option value="Da">Da</option>
                      <option value="Reparat">Da, reparat complet</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      📋 Istoric service
                    </label>
                    <select
                      value={formData.attributes?.serviceHistory || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, serviceHistory: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="Complet">Complet (Carnet service)</option>
                      <option value="Parțial">Parțial</option>
                      <option value="Fără">Fără istoric</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌍 Țara de origine
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.countryOfOrigin || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, countryOfOrigin: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: Germania, România"
                    />
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌍 Ultima țară de înmatriculare
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.lastRegistrationCountry || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, lastRegistrationCountry: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: România"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🌱 Normă poluare
                    </label>
                    <select
                      value={formData.attributes?.environmentalClass || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, environmentalClass: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează...</option>
                      <option value="EURO 6d">EURO 6d</option>
                      <option value="EURO 6">EURO 6</option>
                      <option value="EURO 5">EURO 5</option>
                      <option value="EURO 4">EURO 4</option>
                      <option value="EURO 3">EURO 3</option>
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      ✅ ITP valabil până
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.inspectionValid || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, inspectionValid: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 12/2026"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      🛡️ Garanție
                    </label>
                    <input
                      type="text"
                      value={formData.attributes?.warranty || ''}
                      onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, warranty: e.target.value }})}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                      placeholder="ex: 12 luni, Garanție producător"
                    />
                  </div>
                </div>
              </div>

              {/* Locație */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Locație</h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Județ
                    </label>
                    <select
                      value={formData.county}
                      onChange={(e) => setFormData({ ...formData, county: e.target.value, city: '' })}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600"
                    >
                      <option value="">Selectează județ...</option>
                      {Object.keys(romanianCounties).sort().map((county) => (
                        <option key={county} value={county}>{county}</option>
                      ))}
                    </select>
                  </div>

                  <div className="relative group">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Oraș
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!formData.county}
                      className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium appearance-none cursor-pointer group-hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selectează oraș...</option>
                      {formData.county && romanianCounties[formData.county]?.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Contact</h2>
                
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                    placeholder="+40..."
                  />
                </div>
              </div>

              {/* Descriere */}
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6">Descriere</h2>
                
                <div className="relative group">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Descriere Detaliată
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-3 bg-gray-900/70 border-2 border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:border-[#4E3CFF] focus:ring-4 focus:ring-[#4E3CFF]/20 transition-all duration-normal ease-premium group-hover:border-gray-600"
                    placeholder="Descrie starea, istoricul, caracteristicile..."
                    rows={4}
                  />
                </div>
              </div>

              {/* Butoane */}
              <div className="flex gap-4 justify-end pt-6">
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="px-6 py-3 bg-[#4E3CFF] text-white rounded-xl hover:bg-[#3E2CDF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Se salvează...' : 'Salvează'}
                </button>
                {canRepublish && (
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="px-6 py-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {saving ? 'Se trimite...' : 'Salvează și trimite la moderare'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
