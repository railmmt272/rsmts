import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Asset, AssetSchema } from './schemas/asset.schema.js';
import { AssetsController } from './assets.controller.js';
import { AssetsService } from './assets.service.js';
import { AssetCategoriesModule } from '../asset-categories/asset-categories.module.js';
import { LocationsModule } from '../locations/locations.module.js';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
    AssetCategoriesModule,
    LocationsModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService, MongooseModule],
})
export class AssetsModule {}
