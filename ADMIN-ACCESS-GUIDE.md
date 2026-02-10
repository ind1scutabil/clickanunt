# 🛡️ Ghid Acces Admin Panel - ClickAnunț

## 🔐 Securitate Admin

### Cine Poate Accesa Admin Panel-ul?

**DOAR** utilizatori cu unul dintre următoarele criterii:
- ✅ Email: `owner@autoplatform.ro` (proprietarul platformei)
- ✅ Role: `admin` (utilizatori cărora li s-a acordat rolul de administrator)

### Ce Se Întâmplă Dacă Un Utilizator Normal Încearcă Să Acceseze?

❌ **Utilizatori normali** - Vor primi mesajul:
> ⛔ Acces interzis! Această secțiune este rezervată doar administratorilor.

Apoi vor fi redirectați automat către `/dashboard`

❌ **Utilizatori neautentificați** - Vor primi mesajul:
> 🔒 Trebuie să fii autentificat ca administrator pentru a accesa această pagină.

Apoi vor fi redirectați automat către `/auth/login`

---

## 🌐 Cum Accesezi Admin Panel-ul Pe Domeniul LIVE

### Opțiunea 1: URL Direct ⚡ (Recomandat)

Accesează direct URL-urile admin în browser:

```
https://clickanunt.ro/admin/moderation
https://clickanunt.ro/admin/promotions
```

**📌 Salvează aceste URL-uri în bookmark-uri pentru acces rapid!**

### Opțiunea 2: Din Navbar 🎯

Când ești autentificat ca `owner@autoplatform.ro`:

1. Deschide orice pagină a site-ului
2. Navbar-ul va afișa automat link-urile admin:
   - **💎 Admin - Promoții**
   - **🛡️ Admin - Moderare**
3. Click pe link pentru a accesa

**Notă**: Aceste link-uri sunt vizibile DOAR pentru admin în navbar!

### Opțiunea 3: Acces Rapid din Dashboard

După autentificare ca admin, poți naviga:
```
Dashboard → Click pe "Admin - Moderare" sau "Admin - Promoții" din navbar
```

---

## 🔑 Credențiale Admin Implicite

**Email**: `owner@autoplatform.ro`  
**Parolă**: `admin123`

⚠️ **IMPORTANT**: După deployment pe LIVE, schimbă parola imediat pentru securitate!

---

## 📱 Acces de pe Mobile/Tablet

Admin panel-ul este responsive și funcționează perfect pe:
- 📱 **Telefon**: URL direct sau navbar
- 💻 **Tablet**: URL direct sau navbar
- 🖥️ **Desktop**: URL direct sau navbar

---

## 🚀 Link-uri Admin Rapide (LIVE)

### Moderare
```
https://clickanunt.ro/admin/moderation
```
**Funcționalități**:
- ✅ Aprobare/Respingere anunțuri
- 🚫 Ban/Unban utilizatori
- 👤 Atribuire rol admin
- 💰 Acordare credite/discounturi/promoții gratuite

### Promoții
```
https://clickanunt.ro/admin/promotions
```
**Funcționalități**:
- 📦 Gestionare pachete promovare (preț, durată)
- 🎟️ Gestionare coduri promoționale
- 📊 Statistici venituri și utilizare

---

## 🔒 Securitate Suplimentară (Opțional)

### Nivel 1: Auth Middleware ✅ (Implementat)
- Verificare `localStorage` pentru user
- Redirect automat pentru utilizatori neautorizați

### Nivel 2: Server-Side Verification (Recomandat pentru producție)

Adaugă verificare și pe server în API routes:

```typescript
// app/api/admin/[...]/route.ts
export async function GET(req: Request) {
  const token = req.cookies.get('auth-token');
  if (!token || !isAdmin(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // ... rest of admin logic
}
```

### Nivel 3: Nginx Protection (Extra Security)

Adaugă în `nginx.conf`:
```nginx
location /admin {
    auth_basic "Admin Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:3000;
}
```

---

## 📞 Contact & Suport

Dacă întâmpini probleme cu accesul admin:
1. Verifică dacă ești autentificat cu `owner@autoplatform.ro`
2. Verifică dacă role-ul tău este `admin` în baza de date
3. Șterge cache browser și încearcă din nou
4. Verifică console-ul browser pentru erori

---

## ✅ Checklist Deploy Live

- [ ] Schimbă parola admin implicit
- [ ] Verifică că doar `owner@autoplatform.ro` are acces
- [ ] Testează accesul admin pe URL direct
- [ ] Verifică că utilizatorii normali primesc mesaj de eroare
- [ ] Salvează URL-urile admin în bookmark-uri
- [ ] (Opțional) Adaugă autentificare suplimentară Nginx

---

**🎉 Gata! Acum ai control complet asupra platformei ClickAnunț!**
