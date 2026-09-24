import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum PipelineOperation {
  REPAIRING = 'REPAIRING',
  MANUFACTURING = 'MANUFACTURING',
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  IN_REPAIR = 'IN_REPAIR',
  IN_MANUFACTURING = 'IN_MANUFACTURING',
  CONDEMNED = 'CONDEMNED',
  READY_TO_DISPATCH = 'READY_TO_DISPATCH',
  DISPATCHED = 'DISPATCHED',
}

@Schema({ collection: 'assets', timestamps: true })
export class Asset {
  @Prop({ type: String, required: true, unique: true, index: true, uppercase: true, trim: true })
  assetNumber: string;

  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  categoryCode: string;

  @Prop({ type: String, required: true, enum: AssetStatus, index: true })
  status: AssetStatus;
  
  @Prop({ type: String, required: true, uppercase: true, trim: true, index: true })
  currentLocationCode: string;
  
  @Prop({ type: String, required: true, enum: PipelineOperation, index: true })
  currentPipeline: PipelineOperation;

  @Prop({ type: String, required: true, trim: true })
  remark: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;
}

export type AssetDocument = Asset & mongoose.Document;
export const AssetSchema = SchemaFactory.createForClass(Asset);

