# My Santex — SaaS Sotuv va Ombor Boshqaruv Tizimi

## Texnologiyalar

- **Backend**: NestJS + Prisma + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS + Zustand + React Query

## O'rnatish

### 1. PostgreSQL bazasini yaratish

```bash
sudo -u postgres psql -c "CREATE USER mysantex WITH PASSWORD 'mysantex123';"
sudo -u postgres psql -c "CREATE DATABASE mysantex OWNER mysantex;"
```

### 2. Backend

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx ts-node prisma/seed.ts
npm run start:dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Docs

Backend ishga tushganidan keyin: http://localhost:3000/api/docs

## Demo Login

| Rol | Email | Parol |
|-----|-------|-------|
| Super Admin | admin@mysantex.uz | admin123 |
| ROP | rop@santex.uz | rop123 |
| Sotuvchi | sales@santex.uz | sales123 |

## Arxitektura

```
my-santex/
├── backend/
│   ├── src/
│   │   ├── auth/         # JWT autentifikatsiya
│   │   ├── stores/       # Do'konlar (Super Admin)
│   │   ├── users/        # Xodimlar
│   │   ├── categories/   # Kategoriyalar
│   │   ├── products/     # Tovarlar
│   │   ├── sales/        # Sotuvlar (POS)
│   │   └── prisma/       # DB service
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
└── frontend/
    └── src/
        ├── api/           # Axios API qatlamlari
        ├── components/    # UI va layout komponentlar
        ├── pages/         # Sahifalar
        └── store/         # Zustand holat
```


Muammo va yechim — Texnik topshiriq (TZ)

Loyiha: my-santex (sotuv tizimi)
Muammo: Sotuv yakunlanganda chek printer ga chiqmayapti

---
Muammo nimada edi?

frontend/src/pages/sales/SalesPage.tsx faylida sotuv muvaffaqiyatli saqlangandan keyin printReceipt() funksiyasi chaqirilmagan.

Ekranda "chek chiqarilmoqda..." yozuvi chiqadi, lekin aslida hech narsa qilmayapti.

printReceipt.ts fayli mavjud va to'g'ri yozilgan — lekin u hech qayerdan ishlatilmagan.

---
Qanday tuzatildi?

Fayl: frontend/src/pages/sales/SalesPage.tsx

1. Import qo'shildi (fayl boshiga):
import { printReceipt } from '../../lib/printReceipt'

2. onSuccess ichiga printReceipt(sale) chaqiruvi qo'shildi:

// OLDIN (ishlamas edi):
onSuccess: () => {
  qc.invalidateQueries(...)
  setCart([])
  ...
}

// KEYIN (ishlaydi):
onSuccess: (sale) => {
  printReceipt(sale)   // ← shu qator qo'shildi
  qc.invalidateQueries(...)
  setCart([])
  ...
}

---
Printer sozlamalari (bir martalik)

Ushbu noutbukda XP-80 thermal printer USB orqali ulangan. Quyidagilar bajarildi:

1. Printer Windows tomonidan aniqlanmagan edi → USB driver o'rnatildi
2. Printer noto'g'ri portga (LPT1) ulangan edi → USB001 portiga o'tkazildi
3. XP-80 default printer sifatida belgilandi

---
Loyiha egasiga aytish kerak bo'lgan narsa

▎ SalesPage.tsx da createSale.onSuccess callback i (sale) => { ... } ko'rinishida bo'lishi kerak va ichida birinchi qator printReceipt(sale) bo'lishi kerak. Hozir bu chaqiruv yo'q.

Kod o'zgarishi faqat 2 qator — import va bitta funksiya chaqiruvi.

---
Muhim eslatma (brauzer)

printReceipt funksiyasi window.open() orqali popup ochadi. Brauzer popup larni bloklashi mumkin. Agar "Pop-up bloklandi" xabari chiqsa:

- Brauzer manzil qatoridagi popup belgisini bosib → "Har doim ruxsat berish" ni tanlang
