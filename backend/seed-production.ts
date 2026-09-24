import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { UsersService } from './src/users/users.service.js';
import { UserRole } from './src/users/schemas/user.schema.js';
import { LocationsService } from './src/locations/locations.service.js';
import { AssetCategoriesService } from './src/asset-categories/asset-categories.service.js';
import { AssetCategoryLevel } from './src/asset-categories/schemas/asset-category.schema.js';
import { Model } from 'mongoose';
import { LocationDocument } from './src/locations/schemas/location.schema.js';
import { AssetCategoryDocument } from './src/asset-categories/schemas/asset-category.schema.js';

function generateCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().replace(/_+/g, '_').replace(/_$/, '');
}

async function bootstrap() {
  console.log('--- PRODUCTION SEED INITIATED ---');
  console.log('Connecting to database and initializing application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const locationsService = app.get(LocationsService);
  const assetCategoriesService = app.get(AssetCategoriesService);

  // Access underlying models for safe upserts without relying on strict business validation that might block seeds
  const locationModel = locationsService['locationModel'] as Model<LocationDocument>;
  const assetCategoryModel = assetCategoriesService['assetCategoryModel'] as Model<AssetCategoryDocument>;

  console.log('\n[1/3] SEEDING SYSTEM ADMIN USER...');
  try {
    const admin = await usersService.create({
      name: 'System Admin',
      email: 'admin@gmail.com',
      password: 'password@123',
      role: UserRole.SYSTEM_ADMIN,
      isActive: true,
    });
    console.log(`✅ Created admin user: ${admin.email}`);
  } catch (error: any) {
    if (error.code === 11000) {
      console.log('ℹ️ Admin user already exists. Updating password to ensure access...');
      const existing = await usersService.findByEmailWithPassword('admin@gmail.com');
      if (existing) {
        await usersService.update(existing._id.toString(), { password: 'password@123', isActive: true });
        console.log('✅ Admin user password reset successfully.');
      }
    } else {
      console.error('❌ Error seeding admin user:', error);
    }
  }

  console.log('\n[2/3] SEEDING ASSET CATEGORIES (Hierarchical)...');
  const categoriesToSeed = [
    // Grandparents
    { code: 'WAGON', name: 'Wagon', level: AssetCategoryLevel.GRANDPARENT, identificationRule: { type: 'NUMERIC', length: 11, checkDigit: false } },
    { code: 'LOCO', name: 'Loco', level: AssetCategoryLevel.GRANDPARENT, identificationRule: { type: 'NUMERIC', length: 5, checkDigit: false } },
    { code: 'CRANE', name: 'Crane', level: AssetCategoryLevel.GRANDPARENT, identificationRule: { type: 'NUMERIC', length: 6, checkDigit: false } },
    { code: 'TOWER_CAR', name: 'Tower Car', level: AssetCategoryLevel.GRANDPARENT },
    // Wagon Parents
    ...['BOXNHL', 'BCNHL', 'BVZI', 'BTPN', 'BOBRN', 'BCNA', 'FMP', 'BLC'].map(c => ({ code: c, name: c, level: AssetCategoryLevel.PARENT, parentCode: 'WAGON' })),
    // Loco Parents
    ...['WAP7', 'WAG9', 'WDG4'].map(c => ({ code: c, name: c, level: AssetCategoryLevel.PARENT, parentCode: 'LOCO' })),
    // Crane Parents
    ...['140T_CRANE', '175T_CRANE'].map(c => ({ code: c, name: c.replace('_', ' '), level: AssetCategoryLevel.PARENT, parentCode: 'CRANE' })),
    // Tower Car Parents
    { code: '8W_DETC', name: '8W DETC', level: AssetCategoryLevel.PARENT, parentCode: 'TOWER_CAR', identificationRule: { type: 'NUMERIC', length: 6, checkDigit: false } },
    { code: '4W_DHTC', name: '4W DHTC', level: AssetCategoryLevel.PARENT, parentCode: 'TOWER_CAR', identificationRule: { type: 'NUMERIC', length: 3, checkDigit: false } },
    // Crane Children
    { code: '140T_GOTTWALD', name: '140T Gottwald', level: AssetCategoryLevel.CHILD, parentCode: '140T_CRANE' },
    { code: '175T_HYDRAULIC', name: '175T Hydraulic', level: AssetCategoryLevel.CHILD, parentCode: '175T_CRANE' },
  ];

  let catSuccessCount = 0;
  for (const cat of categoriesToSeed) {
    try {
      await assetCategoryModel.updateOne(
        { code: cat.code },
        { $set: cat },
        { upsert: true }
      );
      catSuccessCount++;
    } catch (err: any) {
      console.error(`❌ Failed to upsert category ${cat.code}:`, err.message);
    }
  }
  console.log(`✅ Processed ${catSuccessCount}/${categoriesToSeed.length} asset categories safely.`);


  console.log('\n[3/3] SEEDING LOCATIONS (Consolidated)...');
  try {
    await locationModel.collection.drop();
    console.log('✅ Dropped existing locations collection.');
  } catch (err: any) {
    if (err.code !== 26) { // 26 is namespace not found
      console.error('❌ Failed to drop locations collection:', err.message);
    }
  }

  const locationsAndShops = [
    'NSY Line no. 1', 'NSY Line no. 2', 'RB Line', 'MDS Line (North)',
    'WRS-5 West Line (North)', 'Challan Line (North)', 'Crane Line', 'NSY D Line',
    'DPS North Line', 'DPS Load Box', 'Cleaning Area A', 'Cleaning Area B',
    'Cleaning Area C', 'Cleaning Area D', 'WRS-2 C/Line', 'MO Line',
    'C-Ward (East)', 'C-Ward (West)', 'Stripping Yard', 'Meat Market Line(East)',
    'Meat Market Line(West)', 'Old Paint Shed (East)', 'Old Paint Shed (West)', 'BST Main Line',
    'BST Middle Line', 'BST Dug Line', 'RM Main Line', 'RM Middle Line',
    'RM Dug Line', 'Tower Car Line', 'Nath Line', 'WC Main Line',
    'WC Middle Line', 'WC Dug Line', 'New Line', 'Dhobighat Line',
    'SSY New Line (East)', 'SSY New Line (West)', 'Steel Foundry Line', 'YS/WRS-3 Line',
    'Sick Line', 'Bahar Line', 'SSY Bagal/Main Line', 'LTC Line',
    'GIF Office Line', 'GIF Centre Line(North)', '20T Way', '140T Way (East)',
    '140T Way (West)', 'Trial Yard (East)', 'Trial Yard (West)', 'GIF Centre Line(South)',
    'GIF Paint Shed Line(East)', 'GIF Paint Shed Line(West)', 'Pig Line', 'Sleeper Line',
    'SSY Bank Line', 'SSY Muck Line', 'SSY Billet Line', 'Forge Shop Line',
    'WRS-4 Line', 'WRS-5 Line (East)', 'WRS-5 West Line (South)', 'MDS Line (South)',
    'Wheel Shop Line', 'BTPN Line', 'DPS South Line (West)', 'Challan Line(South)',
    // Shops
    'WRS 1 to 4', 'GIF Shop', 'BST Shop', 'DPS South', 'DPS North', 'BST', 'WRS 5', 'Crane Shop', 'DPS(S) for wagon repair'
  ];

  let locSuccessCount = 0;
  for (const name of locationsAndShops) {
    const code = generateCode(name);
    try {
      await locationModel.updateOne(
        { code },
        { $set: { code, name, isActive: true } },
        { upsert: true }
      );
      locSuccessCount++;
    } catch (err: any) {
      console.error(`❌ Failed to upsert location ${code}:`, err.message);
    }
  }
  console.log(`✅ Processed ${locSuccessCount}/${locationsAndShops.length} locations safely.`);


  console.log('\n--- PRODUCTION SEED COMPLETED SUCCESSFULLY ---');
  await app.close();
}

bootstrap().then(() => process.exit(0)).catch(console.error);
