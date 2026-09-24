import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type LocationDocument = mongoose.HydratedDocument<Location>;

@Schema({
  collection: 'locations',
  timestamps: true,
})
export class Location {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  })
  code: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  remark?: string | null;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
