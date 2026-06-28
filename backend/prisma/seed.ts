import 'dotenv/config';
import { PrismaClient, UserRole, SubscriptionStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('Seeding database...');

  // Super Admin — PIN: 12627885
  const superAdmin = await prisma.user.upsert({
    where: { pin: '12627885' },
    update: {},
    create: {
      name: 'Super Admin',
      pin: '12627885',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log('Super Admin created, PIN: 12627885');

  // Demo Store
  const store = await prisma.store.upsert({
    where: { email: 'demo@santex.uz' },
    update: {},
    create: {
      name: 'Demo Santex Do\'koni',
      email: 'demo@santex.uz',
      address: 'Toshkent sh., Chilonzor t.',
      phone: '+998901234567',
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('Demo Store created:', store.name);


  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { storeId_name: { storeId: store.id, name: 'Santexnika' } },
      update: {},
      create: { storeId: store.id, name: 'Santexnika', icon: '🚿' },
    }),
    prisma.category.upsert({
      where: { storeId_name: { storeId: store.id, name: 'Quvurlar' } },
      update: {},
      create: { storeId: store.id, name: 'Quvurlar', icon: '🔧' },
    }),
    prisma.category.upsert({
      where: { storeId_name: { storeId: store.id, name: 'Klapanlar' } },
      update: {},
      create: { storeId: store.id, name: 'Klapanlar', icon: '🔩' },
    }),
  ]);
  console.log('Categories created:', categories.length);

  // Products
  const products = [
    { name: 'Dush kabinasi', barcode: '1001', categoryId: categories[0].id, costPrice: 250000, sellPrice: 320000, stock: 15, minStock: 3 },
    { name: 'Sink (Lavabo)', barcode: '1002', categoryId: categories[0].id, costPrice: 180000, sellPrice: 230000, stock: 8, minStock: 2 },
    { name: 'Hajmiy bak 50L', barcode: '1003', categoryId: categories[0].id, costPrice: 450000, sellPrice: 580000, stock: 5, minStock: 2 },
    { name: 'PP quvur 20mm', barcode: '2001', categoryId: categories[1].id, costPrice: 3500, sellPrice: 5000, stock: 200, minStock: 50 },
    { name: 'PP quvur 25mm', barcode: '2002', categoryId: categories[1].id, costPrice: 4500, sellPrice: 6500, stock: 150, minStock: 50 },
    { name: 'Metall quvur 1/2"', barcode: '2003', categoryId: categories[1].id, costPrice: 12000, sellPrice: 16000, stock: 80, minStock: 20 },
    { name: 'To\'suvchi klapan 1/2"', barcode: '3001', categoryId: categories[2].id, costPrice: 8000, sellPrice: 12000, stock: 3, minStock: 5 },
    { name: 'Sharli kran 3/4"', barcode: '3002', categoryId: categories[2].id, costPrice: 15000, sellPrice: 22000, stock: 25, minStock: 10 },
    { name: 'Filtrlash klapan', barcode: '3003', categoryId: categories[2].id, costPrice: 35000, sellPrice: 48000, stock: 12, minStock: 5 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { storeId_barcode: { storeId: store.id, barcode: p.barcode } },
      update: {},
      create: { storeId: store.id, ...p },
    });
  }
  console.log('Products created:', products.length);

  console.log('\n✅ Seed completed!');
  console.log('\nKirish PIN:');
  console.log('  Super Admin: 12627885 (+ yuz tasdiqlash)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
