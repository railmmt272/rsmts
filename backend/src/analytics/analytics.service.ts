import mongoose from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Asset, AssetDocument, AssetStatus } from '../assets/schemas/asset.schema.js';
import { MovementLog, MovementLogDocument } from '../movements/schemas/movement-log.schema.js';
import { PipelineOperation } from '../assets/schemas/asset.schema.js';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: mongoose.Model<AssetDocument>,
    @InjectModel(MovementLog.name) private movementLogModel: mongoose.Model<MovementLogDocument>,
  ) {}

  async getDashboardData(pipeline: string, startDateStr: string, endDateStr: string) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    const pipelineMatch = pipeline === 'ALL' ? {} : { currentPipeline: pipeline as PipelineOperation };

    // 1. Total active assets in pipeline
    const totalAssets = await this.assetModel.countDocuments({
      ...pipelineMatch,
      status: { $ne: AssetStatus.CONDEMNED }
    });

    // 2. Status Distribution (Pie Chart)
    const statusDistribution = await this.assetModel.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Location Bottlenecks (Bar Chart)
    const bottlenecks = await this.assetModel.aggregate([
      { $match: { ...pipelineMatch, status: { $ne: AssetStatus.CONDEMNED } } },
      { $group: { _id: '$currentLocationCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // 4. Movement Throughput (Area Chart)
    // To filter by pipeline, we could look up the asset. For simplicity, 
    // let's do a join (lookup) to filter movements by the asset's current pipeline.
    const throughput = await this.movementLogModel.aggregate([
      {
        $match: {
          movedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $lookup: {
          from: 'assets',
          localField: 'assetId',
          foreignField: '_id',
          as: 'asset'
        }
      },
      { $unwind: '$asset' },
      {
        $match: pipeline === 'ALL' ? {} : { 'asset.currentPipeline': pipeline }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$movedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return {
      totalAssets,
      statusDistribution: statusDistribution.map(s => ({ status: s._id, count: s.count })),
      bottlenecks: bottlenecks.map(b => ({ location: b._id, count: b.count })),
      throughput: throughput.map(t => ({ date: t._id, count: t.count }))
    };
  }
}

