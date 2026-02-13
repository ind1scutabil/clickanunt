# ClickAnunt Enterprise Design System

**Versiune:** 2.0 - Enterprise Ready  
**Ultima actualizare:** 11 Februarie 2026

---

## 🎨 Design Principles

### 1. **Corporate Premium** (nu gaming)
- Gradient-uri subtile, folosite strategic
- Tipografie clară, aerisită
- Contrast excelent pentru lizibilitate
- Spațiere generoasă

### 2. **Consistency First**
- Toate componentele urmează aceleași tokens
- Pattern-uri repetabile
- Predictibilitate în interacțiuni

### 3. **Accessibility Always**
- WCAG 2.1 AA minim
- Keyboard navigation complet
- ARIA labels corecte
- Focus states vizibile

### 4. **Performance Obsessed**
- Lazy loading
- Skeleton states (nu spinners)
- Optimizare imagini
- Code splitting

---

## 🎯 Brand Colors

### Primary Palette
```css
--primary-50: #F5F3FF;   /* Backgrounds subtile */
--primary-100: #EDE9FE;  /* Hover states */
--primary-500: #6D5BFF;  /* Brand principal - CTA, links */
--primary-600: #4E3CFF;  /* Hover CTA */
--primary-700: #5B21B6;  /* Active states */
```

**Folosire:**
- ✅ CTA principal (buton "Adaugă anunț")
- ✅ Links importante
- ✅ Progress indicators
- ❌ NU fundal întreg (doar accente)

### Secondary Palette (Accent Cyan)
```css
--secondary-500: #00D4FF; /* Accent fresh */
--secondary-600: #0891B2; /* Hover accent */
```

**Folosire:**
- ✅ Badges "Top", "Popular"
- ✅ Icon accents
- ✅ Secondary CTA (outline)
- ❌ NU text pe dark (contrast slab)

### Neutrals (Dark Theme Base)
```css
--neutral-950: #0A0A0A;  /* Background principal */
--neutral-925: #0F0F0F;  /* Background #0F1117 */
--neutral-900: #141414;  /* Surface elevated */
--neutral-850: #1A1A1A;  /* Cards */
--neutral-800: #262626;  /* Borders */
--neutral-700: #404040;  /* Borders hover */
--neutral-500: #737373;  /* Text secondary */
--neutral-400: #A3A3A3;  /* Text tertiary */
--neutral-200: #E5E5E5;  /* Text on light bg */
--neutral-100: #F5F5F5;  /* Light surfaces */
--neutral-50: #FAFAFA;   /* White surfaces */
```

### Semantic Colors
```css
/* Success */
--success-500: #22C55E;
--success-600: #16A34A;

/* Error */
--error-500: #EF4444;
--error-600: #DC2626;

/* Warning */
--warning-500: #F59E0B;
--warning-600: #D97706;

/* Info */
--info-500: #3B82F6;
--info-600: #2563EB;
```

---

## 📐 Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

### Type Scale
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| **H1 Display** | 48px (3rem) | 800 | 1.1 | -0.02em |
| **H1 Hero** | 40px (2.5rem) | 700 | 1.2 | -0.01em |
| **H2** | 32px (2rem) | 700 | 1.25 | -0.01em |
| **H3** | 24px (1.5rem) | 600 | 1.3 | normal |
| **H4** | 20px (1.25rem) | 600 | 1.4 | normal |
| **Body Large** | 18px (1.125rem) | 400 | 1.6 | normal |
| **Body** | 16px (1rem) | 400 | 1.6 | normal |
| **Body Small** | 14px (0.875rem) | 400 | 1.5 | normal |
| **Caption** | 12px (0.75rem) | 500 | 1.4 | 0.01em |
| **Label** | 14px (0.875rem) | 600 | 1.4 | 0.02em |

### Usage Guidelines

**✅ DO:**
- H1 unic per pagină
- Hierarchie logică (H2 după H1, nu skip)
- Line-height mai mare pentru body text (1.6-1.7)
- Weight 600-700 pentru headings
- Weight 400-500 pentru body

**❌ DON'T:**
- Font weight > 800 (except display headings)
- Line-height < 1.4 pentru text lizibil
- All caps peste 3 cuvinte
- Text sub 14px pentru interactive elements

---

## 📏 Spacing Scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Component Spacing
- **Card padding:** 24px (space-6)
- **Button padding:** 12px 24px (space-3 space-6)
- **Input padding:** 12px 16px (space-3 space-4)
- **Section margin:** 64px - 96px (space-16 - space-24)

---

## 🔲 Border Radius

```css
--radius-sm: 8px;   /* Badges, tags */
--radius-md: 12px;  /* Buttons, inputs */
--radius-lg: 16px;  /* Cards */
--radius-xl: 20px;  /* Hero sections, modals */
--radius-2xl: 24px; /* Large containers */
--radius-full: 9999px; /* Avatars, pills */
```

---

## 🌑 Shadows & Elevation

```css
/* Soft shadows (prefer these) */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Glow (pentru accent elements) */
--shadow-glow-primary: 0 0 20px rgba(109, 91, 255, 0.3);
--shadow-glow-secondary: 0 0 20px rgba(0, 212, 255, 0.3);
```

**Elevation Levels:**
1. **Flat (0):** Background, surfaces
2. **Raised (sm):** Inputs, subtle borders
3. **Floating (md):** Cards, dropdowns
4. **Overlay (lg):** Modals, popovers
5. **Modal (xl):** Full-screen overlays

---

## ⚡ Motion & Transitions

### Duration
```css
--duration-instant: 100ms;  /* Hover feedback */
--duration-fast: 150ms;     /* Micro-interactions */
--duration-base: 200ms;     /* Default */
--duration-slow: 300ms;     /* Complex animations */
--duration-slower: 400ms;   /* Page transitions */
```

### Easing
```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);        /* Prefer this */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);   /* Default */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful */
```

**Guidelines:**
- Hover: 150ms ease-out
- Focus: instant (0ms)
- Dropdown open: 200ms ease-out
- Modal: 300ms ease-in-out
- Page transition: 400ms ease-in-out

---

## 🧩 Component Library

### Button

**Variants:**
```tsx
<Button variant="primary">Primary CTA</Button>      // Gradient fill
<Button variant="secondary">Secondary</Button>      // Outline
<Button variant="ghost">Ghost</Button>              // Transparent
<Button variant="danger">Delete</Button>            // Red
<Button variant="success">Approve</Button>          // Green
```

**Sizes:**
```tsx
<Button size="sm">Small</Button>    // 32px height
<Button size="md">Medium</Button>   // 40px height
<Button size="lg">Large</Button>    // 48px height
<Button size="xl">Extra</Button>    // 56px height
```

**States:**
- Normal
- Hover (lift + shadow + color shift)
- Active (pressed down)
- Disabled (opacity 0.5, cursor not-allowed)
- Loading (spinner + disabled)

**✅ DO:**
- Max 2 primary buttons per screen
- Destructive actions = danger variant
- Icon + text pentru clarity
- Loading state pe async actions

**❌ DON'T:**
- All caps text (except labels < 3 words)
- Width < 100px pentru primary CTA
- Gradient pe secondary/ghost

---

### Card

**Variants:**
```tsx
<Card variant="default">Default</Card>
<Card variant="elevated">With shadow</Card>
<Card variant="glass">Glassmorphism</Card>
<Card variant="interactive">Hover effect</Card>
```

**Anatomy:**
- Padding: 24px (space-6)
- Border-radius: 16px (radius-lg)
- Background: neutral-850
- Border: 1px solid neutral-800

**Interactive Card Hover:**
```css
transform: translateY(-2px);
box-shadow: var(--shadow-lg);
border-color: var(--primary-500);
transition: all 200ms ease-out;
```

---

### Badge

**Types:**
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="info">Info</Badge>
```

**Sizes:**
- sm: 20px height, 10px padding
- md: 24px height, 12px padding
- lg: 28px height, 14px padding

**Usage:**
- "Top anunț" → primary gradient
- "Verificat" → success green
- "Expiră în 2 zile" → warning orange
- "Respins" → error red
- "Popular" → info blue

---

### Input / Textarea

**States:**
- Default: border-neutral-700
- Focus: border-primary-500 + ring-primary-500/30
- Error: border-error-500 + ring-error-500/30
- Disabled: opacity-50

**Anatomy:**
```tsx
<Input 
  label="Email"
  placeholder="exemplu@email.ro"
  helperText="Vom trimite un cod de verificare"
  error="Email invalid"
/>
```

**Validation:**
- Error state + helper text red
- Success state opțional (checkmark icon)

---

### Skeleton

**Usage:**
- Initial load (nu spinner)
- Infinite scroll
- Lazy loaded sections

**Pattern:**
```tsx
<Skeleton variant="text" width="60%" />
<Skeleton variant="card" height="200px" />
<Skeleton variant="avatar" size="48px" />
```

**Animation:**
```css
background: linear-gradient(
  90deg,
  neutral-850 0%,
  neutral-800 50%,
  neutral-850 100%
);
animation: shimmer 1.5s infinite;
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Tablets portrait */
md: 768px   /* Tablets landscape */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

**Guidelines:**
- Design mobile FIRST
- Touch targets: min 44x44px
- Readable text: min 16px body
- Max content width: 1280px (xl)

---

## ♿ Accessibility Checklist

### Color Contrast
- Text normal (16px): 4.5:1 minimum
- Text large (18px+): 3:1 minimum
- Interactive elements: 3:1 minimum

### Focus States
```css
.focusable:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
  border-radius: var(--radius-md);
}
```

### ARIA Labels
```tsx
<button aria-label="Închide modal">
  <X />
</button>

<nav aria-label="Navigare principală">
  <a href="/" aria-current="page">Acasă</a>
</nav>
```

### Keyboard Navigation
- Tab: next focusable
- Shift+Tab: previous
- Enter/Space: activate
- Escape: close modal/dropdown
- Arrow keys: navigate lists/menus

---

## 🚀 Performance Guidelines

### Images
```tsx
import Image from 'next/image'

<Image
  src="/path/image.jpg"
  alt="Descriptive alt text"
  width={800}
  height={600}
  loading="lazy"
  placeholder="blur"
/>
```

### Code Splitting
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <Skeleton />
})
```

### Memoization
```tsx
const MemoizedCard = memo(ListingCard)

const filteredListings = useMemo(
  () => listings.filter(/* ... */),
  [listings, filters]
)
```

---

## 🎭 Micro-Interactions

### Hover States (Desktop)
```css
transition: all 150ms ease-out;

/* Lift */
&:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Scale */
&:hover {
  transform: scale(1.02);
}

/* Color shift */
&:hover {
  background-color: var(--primary-600);
}
```

### Loading States
- Button: spinner inside + disabled
- List: skeleton grid
- Infinite scroll: spinner bottom

### Success Feedback
- Toast notification (3s auto-dismiss)
- Checkmark animation
- Color flash (green)

---

## 🚫 DON'T Patterns

❌ **Don't overuse gradients**
```css
/* Bad: gradient everywhere */
background: linear-gradient(135deg, #6D5BFF 0%, #00D4FF 100%);

/* Good: solid with subtle accent */
background: #0F1117;
border-left: 3px solid #6D5BFF;
```

❌ **Don't sacrifice contrast**
```css
/* Bad: low contrast */
color: #6D5BFF; /* on dark bg */

/* Good: high contrast */
color: #FFFFFF; /* on dark bg */
```

❌ **Don't skip loading states**
```tsx
// Bad
{data && <List data={data} />}

// Good
{isLoading ? <Skeleton /> : <List data={data} />}
```

❌ **Don't hardcode colors**
```css
/* Bad */
background: #6D5BFF;

/* Good */
background: var(--primary-500);
```

---

## ✅ DO Patterns

✅ **Use semantic tokens**
```tsx
<Button variant="primary">  // not bg-[#6D5BFF]
<Text color="secondary">     // not text-gray-400
```

✅ **Provide feedback**
```tsx
const handleSubmit = async () => {
  setLoading(true)
  try {
    await api.submit()
    toast.success("Salvat cu succes!")
  } catch {
    toast.error("Eroare la salvare")
  } finally {
    setLoading(false)
  }
}
```

✅ **Progressive enhancement**
```tsx
// Works without JS
<form action="/api/submit" method="POST">
  <button type="submit">Submit</button>
</form>

// Enhanced with JS
const handleSubmit = (e) => {
  e.preventDefault()
  // AJAX submit with optimistic UI
}
```

---

## 📦 Component Export Map

```tsx
// app/components/ui/index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Badge } from './Badge'
export { Input, Textarea, Select } from './Input'
export { Skeleton } from './Skeleton'
export { Toast, useToast } from './Toast'
export { Modal } from './Modal'
export { Tabs } from './Tabs'
export { Dropdown } from './Dropdown'
export { Tooltip } from './Tooltip'
export { Avatar } from './Avatar'
export { Progress } from './Progress'
```

---

## 🔄 Migration Strategy

### Phase 1: Tokens (DONE)
- [x] Colors
- [x] Typography
- [x] Spacing
- [x] Shadows
- [x] Motion

### Phase 2: Core Components (IN PROGRESS)
- [ ] Button refinement
- [ ] Card variants
- [ ] Badge system
- [ ] Input states
- [ ] Skeleton library

### Phase 3: Layout Components
- [ ] Navbar sticky + blur
- [ ] Footer restructure
- [ ] Page containers

### Phase 4: Feature Components
- [ ] Listing wizard
- [ ] Filters system
- [ ] Empty states

### Phase 5: Pages
- [ ] Homepage
- [ ] Listings
- [ ] Messages
- [ ] Favorites
- [ ] /business
- [ ] /security

---

**Menținut de:** ClickAnunt Design Team  
**Contact:** design@clickanunt.ro (placeholder)  
**Ultima revizuire:** 11 Februarie 2026
