import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { WORK_STATUS, SHIFT_OPTIONS } from '../schemas/work-register.schema.js';

export class UpdateWorkRegisterDto {
  @IsOptional()
  @IsString()
  @IsEnum(WORK_STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  @IsEnum(SHIFT_OPTIONS)
  shift?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
