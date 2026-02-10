// ============================================
// CATEGORII SI SUBCATEGORII (OLX-style)
// ============================================

export const CATEGORIES: Record<string, string[]> = {
  "Auto, moto și ambarcațiuni": [
    "Autoturisme",
    "Autoutilitare",
    "SUV/Off-road",
    "Camioane",
    "Rulote și remorci",
    "Motociclete/Scutere",
    "ATV",
    "Piese auto",
    "Accesorii auto",
    "Service auto",
    "Ambarcațiuni",
  ],
  "Imobiliare": [
    "Apartamente de vânzare",
    "Case de vânzare",
    "Terenuri",
    "Spații comerciale",
    "Apartamente de închiriat",
    "Case de închiriat",
    "Camere de închiriat",
    "Spații comerciale de închiriat",
    "Garaje",
  ],
  "Electronice și electrocasnice": [
    "Telefoane mobile",
    "Tablete",
    "Laptopuri",
    "Computere desktop",
    "TV",
    "Audio/Video",
    "Console jocuri",
    "Camere foto/video",
    "Frigidere",
    "Mașini de spălat",
    "Aspiratoare",
    "Aparate de aer condiționat",
    "Echipamente IT",
  ],
  "Modă și frumusețe": [
    "Îmbrăcăminte femei",
    "Îmbrăcăminte bărbați",
    "Îmbrăcăminte copii",
    "Încălțăminte",
    "Accesorii",
    "Bijuterii și ceasuri",
    "Genți",
    "Produse cosmetice",
  ],
  "Casă și grădină": [
    "Mobilă",
    "Decorațiuni",
    "Iluminat",
    "Textile casă",
    "Ustensile bucătărie",
    "Unelte și scule",
    "Echipamente grădină",
    "Plante și flori",
    "Materiale construcție",
  ],
  "Sport, timp liber și artă": [
    "Biciclete",
    "Echipament sport",
    "Fitness",
    "Camping",
    "Pescuit/Vânătoare",
    "Cărți",
    "Muzică/Film",
    "Instrumente muzicale",
    "Colecții",
    "Artă",
  ],
  "Copii și bebeluși": [
    "Haine copii/bebeluși",
    "Încălțăminte copii",
    "Cărucioare",
    "Scaune auto",
    "Jucării",
    "Cărți copii",
    "Articole școlari",
    "Mobilier copii",
  ],
  "Animale de companie": [
    "Câini",
    "Pisici",
    "Păsări",
    "Pești acvariu",
    "Rozătoare",
    "Accesorii animale",
    "Hrană animale",
  ],
  "Locuri de muncă": [
    "IT/Software",
    "Vânzări/Marketing",
    "Construcții",
    "Educație",
    "Turism/Horeca",
    "Transport/Logistică",
    "Medical",
    "Alte domenii",
  ],
  "Servicii și afaceri": [
    "Servicii IT",
    "Construcții/Renovări",
    "Reparații",
    "Transport/Mutări",
    "Curățenie",
    "Evenimente",
    "Educație/Cursuri",
    "Servicii juridice",
    "Afaceri de vânzare",
  ],
  "Agricultură": [
    "Tractoare",
    "Utilaje agricole",
    "Animale de fermă",
    "Produse agricole",
    "Terenuri agricole",
  ],
  "Altele": [
    "Diverse",
    "Pierdut/Găsit",
    "Schimb",
    "Donații",
  ],
};

export const ALL_CATEGORIES = Object.keys(CATEGORIES).sort();

// ============================================
// AUTO DATA (pentru categoria Auto)
// ============================================

// Comprehensive database of car makes and their models
export const CAR_MAKES_AND_MODELS: Record<string, string[]> = {
  // Popular European Brands
  "Audi": ["A1", "A2", "A3", "A4", "A4 Allroad", "A5", "A6", "A6 Allroad", "A7", "A8", "Q2", "Q3", "Q4 e-tron", "Q5", "Q7", "Q8", "TT", "TTS", "TT RS", "R8", "RS3", "RS4", "RS5", "RS6", "RS7", "RS Q3", "RS Q8", "S3", "S4", "S5", "S6", "S7", "S8", "SQ5", "SQ7", "SQ8", "e-tron", "e-tron GT"],
  
  "BMW": ["i3", "i4", "i5", "i7", "i8", "iX", "iX1", "iX3", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "1 Series", "2 Series", "2 Series Active Tourer", "2 Series Gran Coupe", "3 Series", "3 Series Gran Turismo", "4 Series", "4 Series Gran Coupe", "5 Series", "5 Series Gran Turismo", "6 Series", "6 Series Gran Coupe", "6 Series Gran Turismo", "7 Series", "8 Series", "M2", "M3", "M4", "M5", "M6", "M8", "X3 M", "X4 M", "X5 M", "X6 M", "Z3", "Z4", "Z8"],
  
  "Mercedes-Benz": ["A-Class", "B-Class", "C-Class", "CLA", "CLK", "CLS", "E-Class", "S-Class", "V-Class", "GLA", "GLB", "GLC", "GLC Coupe", "GLE", "GLE Coupe", "GLS", "G-Class", "EQA", "EQB", "EQC", "EQE", "EQS", "EQS SUV", "SL", "SLC", "SLK", "AMG GT", "AMG GT 4-Door", "Citan", "Vito", "Sprinter", "X-Class"],
  
  "Volkswagen": ["Polo", "Golf", "Golf Plus", "Golf Sportsvan", "Jetta", "Bora", "Passat", "Passat CC", "Arteon", "Touran", "Sharan", "Tiguan", "Tiguan Allspace", "Touareg", "T-Cross", "T-Roc", "Beetle", "Scirocco", "Eos", "Phaeton", "Up!", "ID.3", "ID.4", "ID.5", "ID.7", "ID. Buzz", "Caddy", "Transporter", "Caravelle", "Multivan", "Amarok"],
  
  "Skoda": ["Citigo", "Fabia", "Rapid", "Octavia", "Superb", "Kodiaq", "Karoq", "Kamiq", "Enyaq", "Roomster", "Yeti", "Scala", "Praktik"],
  
  "Seat": ["Mii", "Ibiza", "Leon", "Toledo", "Tarraco", "Arona", "Ateca", "Alhambra", "Altea", "Cordoba", "Exeo"],
  
  "Renault": ["Twingo", "Clio", "Captur", "Megane", "Scenic", "Grand Scenic", "Espace", "Talisman", "Laguna", "Kadjar", "Koleos", "Austral", "Arkana", "Fluence", "Latitude", "Vel Satis", "Kangoo", "Trafic", "Master", "Zoe", "Megane E-Tech"],
  
  "Peugeot": ["108", "208", "308", "508", "3008", "5008", "2008", "4008", "Partner", "Expert", "Boxer", "Rifter", "Traveller", "RCZ", "407", "607", "807", "e-208", "e-2008"],
  
  "Citroen": ["C1", "C2", "C3", "C3 Aircross", "C4", "C4 Cactus", "C4 Picasso", "C5", "C5 Aircross", "C5 X", "Grand C4 Picasso", "Berlingo", "Jumpy", "Jumper", "SpaceTourer", "C-Elysee", "DS3", "DS4", "DS5", "Xsara", "Xsara Picasso", "e-C4"],
  
  "Fiat": ["500", "500L", "500X", "Panda", "Punto", "Tipo", "Bravo", "Linea", "Doblo", "Qubo", "Fiorino", "Ducato", "Stilo", "Marea", "Multipla", "Ulysse", "500e"],
  
  "Alfa Romeo": ["Mito", "Giulietta", "Giulia", "Stelvio", "Tonale", "159", "166", "147", "156", "GT", "Spider", "Brera"],
  
  "Lancia": ["Ypsilon", "Delta", "Musa", "Phedra", "Thesis", "Voyager", "Lybra"],
  
  "Hyundai": ["i10", "i20", "i30", "i40", "Accent", "Elantra", "Sonata", "Santa Fe", "Tucson", "Kona", "Nexo", "Ioniq", "Ioniq 5", "Ioniq 6", "ix35", "ix20", "Veloster", "Coupe", "Genesis", "Terracan", "Matrix", "Trajet", "H1", "H350"],
  
  "Kia": ["Picanto", "Rio", "Ceed", "ProCeed", "Forte", "Stinger", "K5", "Optima", "Niro", "Sorento", "Sportage", "Telluride", "EV6", "EV9", "Soul", "Venga", "Carens", "Carnival", "Sedona", "Magentis", "Cerato", "Opirus"],
  
  "Dacia": ["Sandero", "Sandero Stepway", "Logan", "Logan MCV", "Dokker", "Lodgy", "Duster", "Spring", "Jogger", "Solenza"],
  
  "Opel": ["Adam", "Corsa", "Astra", "Insignia", "Vectra", "Mokka", "Crossland", "Grandland", "Zafira", "Zafira Life", "Meriva", "Omega", "Signum", "Tigra", "Agila", "Antara", "Combo", "Vivaro", "Movano", "Karl", "Ampera"],
  
  "Chevrolet": ["Spark", "Aveo", "Cruze", "Malibu", "Impala", "Camaro", "Corvette", "Trax", "Equinox", "Blazer", "Traverse", "Tahoe", "Suburban", "Silverado", "Colorado", "Captiva", "Orlando", "Lacetti", "Epica", "Nubira"],
  
  "Ford": ["Ka", "Fiesta", "Focus", "Mondeo", "Fusion", "Mustang", "Kuga", "Edge", "Explorer", "Puma", "EcoSport", "Bronco", "Ranger", "F-150", "F-250", "Transit", "Transit Custom", "Transit Connect", "Tourneo", "Galaxy", "S-Max", "C-Max", "B-Max", "Escort", "Sierra", "Cougar"],
  
  "Nissan": ["Micra", "Note", "Juke", "Qashqai", "X-Trail", "Murano", "Pathfinder", "Navara", "Leaf", "Ariya", "Almera", "Primera", "Maxima", "Altima", "370Z", "GT-R", "Cube", "Tiida", "Pulsar", "NV200", "NV300", "NV400", "e-NV200"],
  
  "Toyota": ["Aygo", "Yaris", "Yaris Cross", "Corolla", "Corolla Cross", "Camry", "Avalon", "Prius", "Prius+", "Mirai", "C-HR", "RAV4", "Highlander", "Land Cruiser", "4Runner", "Avensis", "Verso", "Auris", "GT86", "Supra", "Celica", "MR2", "Hilux", "Tundra", "Tacoma", "Proace", "bZ4X"],
  
  "Honda": ["Jazz", "Civic", "Accord", "Legend", "CR-V", "HR-V", "Pilot", "CR-Z", "Insight", "e", "Odyssey", "Prelude", "S2000", "NSX", "FR-V", "Shuttle"],
  
  "Mazda": ["2", "3", "5", "6", "CX-3", "CX-30", "CX-5", "CX-50", "CX-60", "CX-7", "CX-9", "MX-5", "MX-30", "RX-7", "RX-8", "Premacy", "Tribute", "BT-50"],
  
  "Subaru": ["Impreza", "Legacy", "Outback", "Forester", "Crosstrek", "XV", "Ascent", "BRZ", "WRX", "Levorg", "Tribeca", "Solterra"],
  
  "Mitsubishi": ["Space Star", "Mirage", "Lancer", "Galant", "Eclipse", "Eclipse Cross", "ASX", "Outlander", "Pajero", "Pajero Sport", "L200", "Colt", "Carisma"],
  
  "Suzuki": ["Alto", "Celerio", "Swift", "Baleno", "Vitara", "S-Cross", "Jimny", "SX4", "Grand Vitara", "Ignis", "Splash", "Wagon R", "Across", "Swace"],
  
  "Isuzu": ["D-Max", "MU-X", "Trooper"],
  
  // Premium Brands
  "Jaguar": ["XE", "XF", "XJ", "F-Type", "E-PACE", "F-PACE", "I-PACE", "X-Type", "S-Type"],
  
  "Land Rover": ["Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar", "Defender", "Freelander"],
  
  "Porsche": ["911", "718 Boxster", "718 Cayman", "Panamera", "Macan", "Cayenne", "Taycan", "Carrera GT"],
  
  "Lamborghini": ["Huracán", "Aventador", "Urus", "Revuelto", "Gallardo", "Murciélago"],
  
  "Ferrari": ["F8 Tributo", "SF90 Stradale", "Roma", "Portofino", "296 GTB", "812 Superfast", "Purosangue", "488", "458", "California", "F430", "Enzo"],
  
  "Maserati": ["Ghibli", "Quattroporte", "Levante", "MC20", "GranTurismo", "GranCabrio", "Grecale"],
  
  "Bentley": ["Continental GT", "Continental Flying Spur", "Bentayga", "Mulsanne", "Arnage"],
  
  "Rolls-Royce": ["Phantom", "Ghost", "Wraith", "Dawn", "Cullinan", "Spectre"],
  
  "Aston Martin": ["DB9", "DB11", "DBS", "Vantage", "Vanquish", "DBX", "Rapide"],
  
  "Bugatti": ["Chiron", "Veyron", "Bolide", "Divo"],
  
  // Russian/Eastern Brands
  "Lada": ["Niva", "Vesta", "Granta", "Largus", "Kalina", "Priora", "Samara", "2101", "2105", "2107", "2109", "2110", "2112", "4x4"],
  
  "Gazelle": ["Gazelle Next", "Sobol", "Business"],
  
  // Chinese Brands
  "Chery": ["Tiggo 2", "Tiggo 3", "Tiggo 4", "Tiggo 5", "Tiggo 7", "Tiggo 8", "Arrizo 5", "Arrizo 6", "QQ"],
  
  "Geely": ["Emgrand", "Emgrand X7", "Boyue", "Coolray", "Atlas", "Tugella"],
  
  "BYD": ["Qin", "Song", "Tang", "Yuan", "Han", "Seal", "Atto 3", "Dolphin"],
  
  "Great Wall": ["Haval H2", "Haval H6", "Haval H9", "Haval Jolion", "Wey Coffee 01", "Ora Good Cat", "Poer", "Wingle"],
  
  "JAC": ["S2", "S3", "S4", "S5", "S7", "T6", "T8"],
  
  "MG": ["MG3", "MG4", "MG5", "MG6", "MG7", "MG ZS", "MG HS", "MG Marvel R", "MG EHS"],
  
  "Changan": ["Alsvin", "Benni", "CS35", "CS55", "CS75", "CS85", "Raize", "UNI-K", "UNI-T"],
  
  "Dongfeng": ["Aeolus", "Fengon", "Rich"],
  
  "FAW": ["Besturn B30", "Besturn B50", "Besturn B70", "Besturn X40", "Besturn X80"],
  
  "Lifan": ["Solano", "Breez", "X50", "X60", "X70"],
  
  "Lynk & Co": ["01", "02", "03", "05", "06"],
  
  "NIO": ["ES6", "ES7", "ES8", "ET5", "ET7"],
  
  "Xpeng": ["G3", "P5", "P7", "G9"],
  
  // American Brands
  "Cadillac": ["ATS", "CTS", "CT4", "CT5", "CT6", "Escalade", "XT4", "XT5", "XT6", "SRX", "XTS", "ELR", "Lyriq"],
  
  "Dodge": ["Charger", "Challenger", "Durango", "Journey", "Dart", "Nitro", "Caliber", "Avenger", "Viper", "Ram 1500", "Ram 2500"],
  
  "Jeep": ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator", "Commander", "Patriot", "Liberty", "Avenger"],
  
  "Chrysler": ["300", "300C", "Pacifica", "Voyager", "PT Cruiser", "Sebring", "Crossfire"],
  
  "Hummer": ["H1", "H2", "H3", "EV"],
  
  "Buick": ["Encore", "Envision", "Enclave", "Regal", "LaCrosse", "Verano"],
  
  "Lincoln": ["Navigator", "Aviator", "Corsair", "Nautilus", "MKZ", "Continental"],
  
  "Tesla": ["Model 3", "Model S", "Model X", "Model Y", "Cybertruck", "Roadster"],
  
  // Korean Brands
  "Genesis": ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  
  "Ssangyong": ["Korando", "Tivoli", "Rexton", "Musso", "Rodius", "Kyron", "Actyon"],
  
  // Additional European Brands
  "Volvo": ["XC40", "XC60", "XC90", "S60", "S90", "V40", "V60", "V90", "C40 Recharge", "C30", "C70", "S40", "S80", "850", "940", "960", "V70", "V50"],
  
  "Saab": ["9-3", "9-5", "9-4X", "9-7X", "900", "9000"],
  
  "Smart": ["Fortwo", "Forfour", "Roadster", "EQ Fortwo", "#1"],
  
  "Mini": ["Cooper", "Cooper S", "Cooper D", "Countryman", "Clubman", "Paceman", "Roadster", "Coupe", "Electric"],
  
  "DS": ["DS 3", "DS 4", "DS 5", "DS 7", "DS 9", "DS 3 Crossback"],
  
  "Infiniti": ["Q30", "Q50", "Q60", "Q70", "QX30", "QX50", "QX55", "QX60", "QX70", "QX80", "FX", "G", "M"],
  
  "Lexus": ["CT", "IS", "ES", "GS", "LS", "RC", "LC", "UX", "NX", "RX", "GX", "LX", "RZ"],
  
  "Acura": ["ILX", "TLX", "RLX", "MDX", "RDX", "NSX", "Integra"],
  
  // Romanian Brand
  "ARO": ["10", "24", "240", "244", "246"],
};

export const POPULAR_MAKES = Object.keys(CAR_MAKES_AND_MODELS).sort();

// Romanian counties (județe)
export const ROMANIAN_COUNTIES = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brăila",
  "Brașov",
  "București",
  "Buzău",
  "Călărași",
  "Caraș-Severin",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Sălaj",
  "Satu Mare",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vâlcea",
  "Vaslui",
  "Vrancea",
];

// Major cities by county (județ)
export const CITIES_BY_COUNTY: Record<string, string[]> = {
  "Alba": ["Alba Iulia", "Sebeș", "Aiud", "Blaj", "Cugir"],
  "Arad": ["Arad", "Ineu", "Chișineu-Criș", "Curtici", "Lipova"],
  "Argeș": ["Pitești", "Curtea de Argeș", "Câmpulung", "Mioveni", "Costești"],
  "Bacău": ["Bacău", "Onești", "Moinești", "Comănești", "Buhuși"],
  "Bihor": ["Oradea", "Salonta", "Marghita", "Beiuș", "Aleșd"],
  "Bistrița-Năsăud": ["Bistrița", "Beclean", "Năsăud", "Sângeorz-Băi"],
  "Botoșani": ["Botoșani", "Dorohoi", "Săveni", "Flămânzi", "Darabani"],
  "Brăila": ["Brăila", "Ianca", "Făurei", "Însurăței"],
  "Brașov": ["Brașov", "Făgăraș", "Săcele", "Codlea", "Zărnești", "Predeal", "Râșnov"],
  "București": ["Sectorul 1", "Sectorul 2", "Sectorul 3", "Sectorul 4", "Sectorul 5", "Sectorul 6"],
  "Buzău": ["Buzău", "Râmnicu Sărat", "Nehoiu", "Pogoanele", "Pătârlagele"],
  "Călărași": ["Călărași", "Oltenița", "Budești", "Fundulea", "Lehliu Gară"],
  "Caraș-Severin": ["Reșița", "Caransebeș", "Bocșa", "Moldova Nouă", "Oțelu Roșu"],
  "Cluj": ["Cluj-Napoca", "Turda", "Dej", "Gherla", "Câmpia Turzii", "Huedin"],
  "Constanța": ["Constanța", "Mangalia", "Medgidia", "Năvodari", "Cernavodă", "Eforie Nord", "Eforie Sud", "Techirghiol"],
  "Covasna": ["Sfântu Gheorghe", "Târgu Secuiesc", "Covasna", "Întorsura Buzăului", "Baraolt"],
  "Dâmbovița": ["Târgoviște", "Moreni", "Pucioasa", "Găești", "Fieni", "Titu"],
  "Dolj": ["Craiova", "Calafat", "Băilești", "Filiași", "Segarcea"],
  "Galați": ["Galați", "Tecuci", "Târgu Bujor", "Berești"],
  "Giurgiu": ["Giurgiu", "Bolintin-Vale", "Mihăilești"],
  "Gorj": ["Târgu Jiu", "Motru", "Rovinari", "Novaci", "Târgu Cărbunești", "Turceni", "Țicleni", "Bumbești-Jiu"],
  "Harghita": ["Miercurea Ciuc", "Odorheiu Secuiesc", "Toplița", "Gheorgheni", "Cristuru Secuiesc", "Bălan", "Borsec"],
  "Hunedoara": ["Deva", "Hunedoara", "Petroșani", "Vulcan", "Lupeni", "Orăștioara de Sus", "Brad", "Hațeg"],
  "Ialomița": ["Slobozia", "Fetești", "Urziceni", "Țăndărei", "Fierbinți-Târg"],
  "Iași": ["Iași", "Pașcani", "Hârlău", "Târgu Frumos"],
  "Ilfov": ["Buftea", "Voluntari", "Pantelimon", "Popești-Leordeni", "Bragadiru", "Chitila", "Otopeni", "Măgurele"],
  "Maramureș": ["Baia Mare", "Sighetu Marmației", "Borșa", "Vișeu de Sus", "Târgu Lăpuș", "Cavnic", "Șomcuta Mare", "Ulmeni", "Seini", "Săliștea de Sus", "Tăuții-Măgherăuș"],
  "Mehedinți": ["Drobeta-Turnu Severin", "Orșova", "Strehaia", "Baia de Aramă", "Vânju Mare"],
  "Mureș": ["Târgu Mureș", "Reghin", "Sighișoara", "Târnăveni", "Ludușul de Mureș"],
  "Neamț": ["Piatra Neamț", "Roman", "Târgu Neamț", "Roznov"],
  "Olt": ["Slatina", "Caracal", "Balș", "Corabia", "Drăgănești-Olt", "Scornicești", "Piatra Olt", "Potcoava"],
  "Prahova": ["Ploiești", "Câmpina", "Sinaia", "Bușteni", "Mizil", "Băicoi", "Vălenii de Munte", "Azuga", "Breaza", "Comarnic", "Urlați"],
  "Sălaj": ["Zalău", "Șimleu Silvaniei", "Jibou", "Cehu Silvaniei"],
  "Satu Mare": ["Satu Mare", "Carei", "Negrești-Oaș", "Ardud", "Livada", "Tășnad"],
  "Sibiu": ["Sibiu", "Mediaș", "Agnita", "Cisnădie", "Copșa Mică", "Dumbrăveni", "Avrig", "Tălmaciu", "Ocna Sibiului", "Miercurea Sibiului", "Saliste"],
  "Suceava": ["Suceava", "Fălticeni", "Rădăuți", "Câmpulung Moldovenesc", "Vatra Dornei", "Gura Humorului", "Siret", "Dolhasca", "Broșteni", "Cajvana", "Liteni", "Milișăuți", "Salcea", "Solca", "Vicovu de Sus"],
  "Teleorman": ["Alexandria", "Roșiorii de Vede", "Turnu Măgurele", "Zimnicea", "Videle"],
  "Timiș": ["Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia", "Buziaș", "Făget", "Deta", "Recaș"],
  "Tulcea": ["Tulcea", "Babadag", "Măcin", "Sulina", "Isaccea"],
  "Vâlcea": ["Râmnicu Vâlcea", "Drăgășani", "Băile Olănești", "Băile Govora", "Horezu", "Călimănești", "Brezoi", "Ocnele Mari"],
  "Vaslui": ["Vaslui", "Bârlad", "Huși", "Negrești", "Murgeni"],
  "Vrancea": ["Focșani", "Adjud", "Mărășești", "Odobești", "Panciu"],
};

// Get all cities as a flat sorted array
export const ALL_CITIES = Object.values(CITIES_BY_COUNTY)
  .flat()
  .sort();
