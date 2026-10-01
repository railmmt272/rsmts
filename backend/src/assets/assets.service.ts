import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Asset, AssetDocument, AssetStatus } from './schemas/asset.schema.js';
import { RegisterAssetDto } from './dto/register-asset.dto.js';
import { AssetCategoriesService } from '../asset-categories/asset-categories.service.js';
import { LocationsService } from '../locations/locations.service.js';
import { PipelineOperation } from './schemas/asset.schema.js';
import { IdentificationType } from '../asset-categories/schemas/asset-category.schema.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';
import { CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: mongoose.Model<AssetDocument>,
    @Inject(AssetCategoriesService) private assetCategoriesService: AssetCategoriesService,
    @Inject(LocationsService) private locationsService: LocationsService,
  ) {}

  async registerAsset(dto: RegisterAssetDto, user: CurrentUserPayload): Promise<Asset> {


    // 1 & 2. Verify Category exists and is active
    const category = await this.assetCategoriesService.findOne(dto.categoryCode);
    if (!category.isActive) {
      throw new BadRequestException(`Asset category ${dto.categoryCode} is inactive.`);
    }

    // Pipeline vs Category Validation
    let currentCategory = category;
    while (currentCategory.parentCode) {
      currentCategory = await this.assetCategoriesService.findOne(currentCategory.parentCode);
    }
    const rootCategoryCode = currentCategory.code;

    if (dto.operation === PipelineOperation.WAGON_POH) {
      if (rootCategoryCode !== 'WAGON') {
        throw new BadRequestException('WAGON_POH pipeline only supports WAGON assets.');
      }
    } else if (dto.operation === PipelineOperation.OTHERS) {
      if (!['WAGON_MFG', 'LOCO', 'CRANE', 'TOWER_CAR'].includes(rootCategoryCode)) {
        throw new BadRequestException('OTHERS pipeline only supports WAGON_MFG, LOCO, CRANE, and TOWER_CAR assets.');
      }
    }

    // 4. Resolve identification rule
    const idRule = await this.assetCategoriesService.getEffectiveIdentificationRule(dto.categoryCode);
    if (!idRule) {
      throw new BadRequestException(`No identification rule defined for category ${dto.categoryCode} or its ancestors.`);
    }

    // 5. Validate Asset Number (Generic Validation)
    if (idRule.type === IdentificationType.NUMERIC) {
      if (!/^\d+$/.test(dto.assetNumber)) {
        throw new BadRequestException(`Asset number must be numeric, got: ${dto.assetNumber}`);
      }
    } else if (idRule.type === IdentificationType.ALPHANUMERIC) {
      if (!/^[A-Z0-9]+$/.test(dto.assetNumber)) {
        throw new BadRequestException(`Asset number must be alphanumeric, got: ${dto.assetNumber}`);
      }
    } else {
      throw new BadRequestException(`Unsupported identification type: ${idRule.type}`);
    }

    if (dto.assetNumber.length !== idRule.length) {
      throw new BadRequestException(`Asset number must be exactly ${idRule.length} characters long, got ${dto.assetNumber.length}`);
    }

    // 6. Asset number is unique
    const existing = await this.assetModel.findOne({ assetNumber: dto.assetNumber }).exec();
    if (existing) {
      throw new BadRequestException(`Asset number ${dto.assetNumber} is already registered.`);
    }

    // 7. Verify Location exists and is active
    const location = await this.locationsService.findOne(dto.currentLocationCode);
    if (!location.isActive) {
      throw new BadRequestException(`Location ${dto.currentLocationCode} is inactive.`);
    }

    // 9. Routing eligibility validation removed - any asset can go to any location
    // 10. Remark is non-empty (handled by DTO @IsNotEmpty / trim)

    // 11. Derive pipeline/status
    const currentPipeline = dto.operation;
    const status = currentPipeline === PipelineOperation.WAGON_POH 
      ? AssetStatus.IN_WAGON_POH 
      : AssetStatus.IN_OTHERS;

    // 12. Create asset
    const newAsset = new this.assetModel({
      assetNumber: dto.assetNumber,
      categoryCode: dto.categoryCode,
      status: status,
      currentLocationCode: dto.currentLocationCode,
      currentPipeline: currentPipeline,
      remark: dto.remark,
      isActive: true,
    });

    return newAsset.save();
  }

  async findAll(user: CurrentUserPayload): Promise<Asset[]> {
    const filter: any = {};

    return this.assetModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findOne(assetNumber: string, user: CurrentUserPayload): Promise<Asset> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }



    return asset;
  }

  async updateStatus(assetNumber: string, dto: UpdateAssetStatusDto, user: CurrentUserPayload): Promise<Asset> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }



    asset.status = dto.status;
    return asset.save();
  }

  async removeAsset(assetNumber: string, user: CurrentUserPayload): Promise<{ deleted: boolean }> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }



    await this.assetModel.deleteOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    return { deleted: true };
  }
}
