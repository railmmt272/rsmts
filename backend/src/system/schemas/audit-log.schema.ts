import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';


@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ type: String, required: true, index: true })
  userEmail: string;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: Number, required: true })
  statusCode: number;

  @Prop({ type: Object })
  payload: any;
}

export type AuditLogDocument = AuditLog & mongoose.Document;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Automatically delete documents after 7 days (604800 seconds)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
