import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { LocationsService } from '../src/locations/locations.service.js';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { LocationDocument } from '../src/locations/schemas/location.schema.js';

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

function generateCode(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().replace(/_+/g, '_').replace(/_$/, '');
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // We need to bypass the service if it prevents dropping the collection
  // so we'll get the raw model
  const locationModel = app.get<mongoose.Model<LocationDocument>>('LocationModel');

  console.log('Dropping existing locations collection...');
  await locationModel.deleteMany({});
  
  console.log('Inserting new consolidated locations...');
  for (const name of locationsAndShops) {
    const code = generateCode(name);
    try {
      await locationModel.create({
        code,
        name,
        isActive: true,
      });
      console.log(`Inserted: ${name} (${code})`);
    } catch (e: any) {
      console.error(`Failed to insert ${name}:`, e.message);
    }
  }

  console.log('Seeding complete.');
  await app.close();
  process.exit(0);
}

bootstrap();
