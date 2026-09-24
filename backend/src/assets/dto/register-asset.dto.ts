import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PipelineOperation } from '../schemas/asset.schema.js';
import { Transform } from 'class-transformer';

export class RegisterAssetDto {
  @IsEnum(PipelineOperation)
  @IsNotEmpty()
  operation: PipelineOperation;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  categoryCode: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  assetNumber: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase().trim() : value)
  currentLocationCode: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  remark: string;
}
