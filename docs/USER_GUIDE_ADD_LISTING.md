# 🎯 Cum să Adaugi Anunțuri - Ghid Rapid

## ✅ Problema Fixată

- ✅ Filtrele vechi **nu mai rămân** după ce publici anunțul
- ✅ Poti **reseta manual** formularul cu butonul 🔄
- ✅ Upload imagini are **logging detaliat** (DevTools)
- ✅ Formular **se salvează automat** (nu-ți pierzi datele)

---

## 🚀 Cum se Folosește

### 1️⃣ **Anunț Complet Nou** (Formular Gol)
```
Deschide: https://www.clickanunt.ro/listings/new?new
```
- Formular **100% gol**
- Zero date vechi

### 2️⃣ **Reiau ce Am Început** (Draft Salvat)
```
Deschide: https://www.clickanunt.ro/listings/new
```
- Dacă ai datele din sesiunea anterioară → Se încarcă automat
- Dacă nu ai nimic → Formular gol

### 3️⃣ **Reset Manual în Curs**
1. Ești pe Pasul 2 sau 3
2. Apasă butonul **🔄 Reset** din colțul dreapta
3. Confirmă: "Ești sigur?"
4. Click OK
5. ✅ Formularul e gol din nou

---

## 📸 Upload Imagini

### Cum Upload-ez Poze?
1. Scroll la **Poze** (Pasul 1)
2. Click zona cu 📷
3. Selectează poze din calculator (până la 20)
4. Sau Drag & Drop poze în zona gri

### Dacă Nu Merge Upload:
1. **DevTools**: Apasă **F12** (Console tab)
2. Selectează poze din nou
3. Cauta în console:
   - 📸 = Procesare
   - 📤 = Trimit
   - ✅ = Reușit
   - ❌ = Eroare (citeste mesajul)

### Size Limit:
- **Max per poză**: 10 MB
- **Max per anunț**: 20 poze
- **Format**: JPG, PNG, WebP, GIF

---

## 💾 Salvare Automată

- Formularul se **salvează automat** la fiecare 3 secunde
- Indicator: **✓ Salvat automat** in header
- **Nu-ti pierzi** datele dacă inchizi accidental tab-ul

### Unde se Salvează?
- Local în browser (localStorage)
- Doar pe calculatorul tău
- Se curață după ce publici anunțul

---

## 🎬 Fluxuri Clasice

### Scenario 1: Normal
```
1. /listings/new?new      → Formular gol
2. Completezi toate date  → Se salvează automat
3. Apasă "Publică"        → Upload anunț
4. Redirect la anunț      → Draft se curață
5. Next /listings/new?new → Formular gol din nou
```

### Scenario 2: Reiau După
```
1. /listings/new?new        → Formular gol
2. Completezi Pasul 1 & 2   → Se salvează
3. (Inchid browser)         → Draft rămâne salvat
4. (Reapar la /listings/new) → Draft se reîncarcă automat!
5. Continui de unde am lăsat
```

### Scenario 3: Voi alte Date
```
1. /listings/new       → Draft anterior se reîncarcă
2. (Imi regret...)
3. Apasă 🔄 Reset     → Confirmare
4. Click OK            → Formularul e gol
5. Completez de la 0
```

---

## ⚠️ Troubleshooting

### "Upload nu merge"
- [ ] Fișierul e imagine? (JPG, PNG, etc.)
- [ ] Fișierul < 10MB?
- [ ] Network OK? (F12 → Network tab)
- [ ] Așteptă 5s, retry
- [ ] Deschide console (F12), cauta ❌ mesaj

### "Filtrele din lăsat zilele"
- [ ] Apasă 🔄 Reset
- [ ] Sau vizitează `/listings/new?new`

### "Nu vad butonul 🔄 Reset"
- [ ] Ai ajuns la Pasul 2+?
- [ ] Pe Pasul 0 (quick input) nu apare
- [ ] Move to Step 1 → Button apare

### "Datele dispăruseră"
- [ ] LocalStorage șters? (DevTools)
- [ ] Incognito mode? (Draft nu se salvează)
- [ ] Start din nou

---

## 💡 Pro Tips

1. **Bookmark**: `https://www.clickanunt.ro/listings/new?new`
   - Quick access la formular gol

2. **Mobile**: Landscape mode
   - Ușor să scrii și să uploadezi

3. **Imagini**: Upload pe WiFi
   - Faster upload, less data

4. **Console**: F12 → Console
   - Loggin detaliat ajută la debug

---

## 🎯 Checklist Înainte de Publish

- [ ] Titlu complet și clar
- [ ] Preț corect
- [ ] Categorie selectată
- [ ] Județ & Oraș corecte
- [ ] Minim 1 poză adăugată
- [ ] Descriere detaliată (min 20 caractere)
- [ ] Telefon valid (min 10 cifre)
- [ ] Doar apoi: **Publică**

---

**Ceva nu merge? Citiți documentul tehnic în /docs/FIX_FORM_RESET_UPLOAD.md**
