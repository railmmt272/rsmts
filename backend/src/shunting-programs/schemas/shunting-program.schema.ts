import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';

@Schema({ timestamps: true })
export class ShuntingProgram extends Document {
  @Prop({ type: String, required: true })
  initialPosition: string;

  @Prop({ type: String, required: true, enum: ['WAGON', 'LOCO', 'CRANE', 'MANUFACTURING'] })
  shop: string;

  @Prop({ type: String, required: true })
  remark: string;

  @Prop({ type: String, enum: ['PENDING', 'DONE'], default: 'PENDING' })
  status: string;

  @Prop({ type: Date })
  dateMarkedDone?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: User | Types.ObjectId;
}

export const ShuntingProgramSchema = SchemaFactory.createForClass(ShuntingProgram);
