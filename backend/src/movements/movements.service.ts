import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Asset, AssetDocument, AssetStatus } from '../assets/schemas/asset.schema.js';
import { MovementLog, MovementLogDocument } from './schemas/movement-log.schema.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { LocationsService } from '../locations/locations.service.js';

@Injectable()
export class MovementsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: mongoose.Model<AssetDocument>,
    @InjectModel(MovementLog.name) private movementLogModel: mongoose.Model<MovementLogDocument>,
    @Inject(LocationsService) private locationsService: LocationsService,
    @InjectConnection() private connection: mongoose.Connection,
  ) {}

  async moveAsset(createMovementDto: CreateMovementDto, userId: string) {
    const { assetNumber, toLocationCode, remark } = createMovementDto;

    // Start a transaction session
    const session = await this.connection.startSession();
    
    let result;

    try {
      await session.withTransaction(async () => {
        // 1. Load Asset inside transaction
        const asset = await this.assetModel.findOne({ assetNumber }).session(session).exec();
        
        if (!asset) {
          throw new NotFoundException(`Asset with number ${assetNumber} not found.`);
        }
        
        if (!asset.isActive) {
          throw new BadRequestException(`Asset ${assetNumber} is not active.`);
        }

        if (asset.status === AssetStatus.CONDEMNED) {
          throw new BadRequestException(`Asset ${assetNumber} is condemned and cannot be moved.`);
        }

        const fromLocationCode = asset.currentLocationCode;

        // 2. Validate destination exists
        const toLocation = await this.locationsService.findOne(toLocationCode);
        if (!toLocation) {
          throw new BadRequestException(`Location ${toLocationCode} does not exist.`);
        }
        if (!toLocation.isActive) {
          throw new BadRequestException(`Location ${toLocationCode} is inactive.`);
        }

        // 3. Routing validation removed - assets can be moved to any active location

        // 4. Create MovementLog
        const movementLogs = await this.movementLogModel.create(
          [
            {
              assetId: asset._id,
              fromLocationCode,
              toLocationCode,
              movedBy: userId,
              remark,
            },
          ],
          { session },
        );

        const movementLog = movementLogs[0];

        // 5. Update Asset's current location
        asset.currentLocationCode = toLocationCode;

        // 6. If asset was in a dispatch state, reallocating it resets its status
        //    back to the active pipeline status (re-entering workshop flow).
        if (
          asset.status === AssetStatus.READY_TO_DISPATCH ||
          asset.status === AssetStatus.DISPATCHED
        ) {
          asset.status =
            asset.currentPipeline === 'MANUFACTURING'
              ? AssetStatus.IN_MANUFACTURING
              : AssetStatus.IN_REPAIR;
        }

        await asset.save({ session });

        result = movementLog;
      });
    } finally {
      await session.endSession();
    }

    return result;
  }

  async getAssetHistory(assetNumber: string) {
    const asset = await this.assetModel.findOne({ assetNumber }).exec();
    if (!asset) {
      throw new NotFoundException(`Asset with number ${assetNumber} not found.`);
    }

    return this.movementLogModel
      .find({ assetId: asset._id })
      .sort({ movedAt: -1 })
      .populate('movedBy', 'username name email') // assuming user has these fields
      .exec();
  }
}
