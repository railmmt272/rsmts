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
    if (user.role === UserRole.MANUFACTURING_SUPERVISOR && dto.operation !== PipelineOperation.MANUFACTURING) {
      throw new ForbiddenException('Manufacturing Supervisors can only register assets in the MANUFACTURING pipeline.');
    }
    if (user.role === UserRole.REPAIR_SUPERVISOR && dto.operation !== PipelineOperation.REPAIRING) {
      throw new ForbiddenException('Repair Supervisors can only register assets in the REPAIR pipeline.');
    }

    // 1 & 2. Verify Category exists and is active
    const category = await this.assetCategoriesService.findOne(dto.categoryCode);
    if (!category.isActive) {
      throw new BadRequestException(`Asset category ${dto.categoryCode} is inactive.`);
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
    const status = currentPipeline === PipelineOperation.REPAIRING 
      ? AssetStatus.IN_REPAIR 
      : AssetStatus.IN_MANUFACTURING;

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
    if (user.role === UserRole.MANUFACTURING_SUPERVISOR) {
      filter.currentPipeline = PipelineOperation.MANUFACTURING;
    } else if (user.role === UserRole.REPAIR_SUPERVISOR) {
      filter.currentPipeline = PipelineOperation.REPAIRING;
    }
    return this.assetModel.find(filter).sort({ updatedAt: -1 }).exec();
  }

  async findOne(assetNumber: string, user: CurrentUserPayload): Promise<Asset> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }

    if (user.role === UserRole.MANUFACTURING_SUPERVISOR && asset.currentPipeline !== PipelineOperation.MANUFACTURING) {
      throw new ForbiddenException('Manufacturing Supervisors can only access assets in the MANUFACTURING pipeline.');
    }
    if (user.role === UserRole.REPAIR_SUPERVISOR && asset.currentPipeline !== PipelineOperation.REPAIRING) {
      throw new ForbiddenException('Repair Supervisors can only access assets in the REPAIR pipeline.');
    }

    return asset;
  }

  async updateStatus(assetNumber: string, dto: UpdateAssetStatusDto, user: CurrentUserPayload): Promise<Asset> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }

    if (user.role === UserRole.MANUFACTURING_SUPERVISOR && asset.currentPipeline !== PipelineOperation.MANUFACTURING) {
      throw new ForbiddenException('Manufacturing Supervisors can only update assets in the MANUFACTURING pipeline.');
    }
    if (user.role === UserRole.REPAIR_SUPERVISOR && asset.currentPipeline !== PipelineOperation.REPAIRING) {
      throw new ForbiddenException('Repair Supervisors can only update assets in the REPAIR pipeline.');
    }

    asset.status = dto.status;
    return asset.save();
  }

  async removeAsset(assetNumber: string, user: CurrentUserPayload): Promise<{ deleted: boolean }> {
    const asset = await this.assetModel.findOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset ${assetNumber} not found`);
    }

    if (user.role === UserRole.MANUFACTURING_SUPERVISOR && asset.currentPipeline !== PipelineOperation.MANUFACTURING) {
      throw new ForbiddenException('Manufacturing Supervisors can only delete assets in the MANUFACTURING pipeline.');
    }
    if (user.role === UserRole.REPAIR_SUPERVISOR && asset.currentPipeline !== PipelineOperation.REPAIRING) {
      throw new ForbiddenException('Repair Supervisors can only delete assets in the REPAIR pipeline.');
    }

    await this.assetModel.deleteOne({ assetNumber: assetNumber.toUpperCase() }).exec();
    return { deleted: true };
  }
}
