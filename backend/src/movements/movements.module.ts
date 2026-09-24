import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MovementsService } from './movements.service.js';
import { MovementsController } from './movements.controller.js';
import { MovementLog, MovementLogSchema } from './schemas/movement-log.schema.js';
import { AssetsModule } from '../assets/assets.module.js';
import { LocationsModule } from '../locations/locations.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MovementLog.name, schema: MovementLogSchema }]),
    AssetsModule, // To get MongooseModule for Asset and AssetsService
    LocationsModule,
  ],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
