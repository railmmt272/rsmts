import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId, IsDateString } from 'class-validator';
import { WORK_STATUS, SHIFT_OPTIONS } from '../schemas/work-register.schema.js';

export class CreateWorkRegisterDto {
  @IsMongoId()
  @IsNotEmpty()
  shuntingProgramId: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(SHIFT_OPTIONS)
  shift: string;

  @IsOptional()
  @IsString()
  @IsEnum(WORK_STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
