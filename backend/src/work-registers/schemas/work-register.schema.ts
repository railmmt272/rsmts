import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export const WORK_STATUS = ['COMPLETED', 'NOT_ATTENDED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'] as const;
export type WorkStatus = typeof WORK_STATUS[number];

export const SHIFT_OPTIONS = ['MORNING', 'STAGGERED', 'NIGHT'] as const;
export type ShiftOption = typeof SHIFT_OPTIONS[number];

@Schema({ _id: true })
export class StatusHistoryEntry {
  @Prop({ type: String, enum: WORK_STATUS, required: true })
  status: WorkStatus;

  @Prop({ type: String, default: '' })
  remark?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  changedAt: Date;
}

export const StatusHistoryEntrySchema = SchemaFactory.createForClass(StatusHistoryEntry);

@Schema({ timestamps: true, collection: 'work_registers' })
export class WorkRegister extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ShuntingProgram', required: true, index: true })
  shuntingProgram: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date(), index: true })
  date: Date;

  @Prop({ type: String, required: true, enum: SHIFT_OPTIONS, index: true })
  shift: ShiftOption;

  @Prop({ type: String, required: true, enum: WORK_STATUS, default: 'NOT_ATTENDED', index: true })
  status: WorkStatus;

  @Prop({ type: String, default: '' })
  remark?: string;

  @Prop({ type: [StatusHistoryEntrySchema], default: [] })
  statusHistory: StatusHistoryEntry[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const WorkRegisterSchema = SchemaFactory.createForClass(WorkRegister);
