import mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';


export type UserDocument = mongoose.HydratedDocument<User>;

export enum UserRole {
  WAGON_ADMIN = 'WAGON_ADMIN',
  TPT_RAIL_ADMIN = 'TPT_RAIL_ADMIN',
  MANUFACTURING_ADMIN = 'MANUFACTURING_ADMIN',
  CRANE_ADMIN = 'CRANE_ADMIN',
  LOCO_ADMIN = 'LOCO_ADMIN',
  VIEWER = 'VIEWER',
}

@Schema({
  collection: 'users',
  timestamps: true,
})
export class User {
  _id: mongoose.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
    select: false,
  })
  password: string;

  @Prop({
    type: String,
    required: true,
    enum: UserRole,
    index: true,
  })
  role: UserRole;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  remark?: string;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

