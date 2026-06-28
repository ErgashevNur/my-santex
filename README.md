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
