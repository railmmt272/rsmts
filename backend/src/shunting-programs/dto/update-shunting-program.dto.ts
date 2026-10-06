import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class UpdateShuntingProgramDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  initialPosition?: string;

  @IsOptional()
  @IsString()
  finalPosition?: string;

  @IsOptional()
  @IsString()
  rsType?: string;

  @IsOptional()
  @IsString()
  rsNo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsEnum(['WAGON', 'LOCO', 'CRANE', 'MANUFACTURING'])
  shop?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  remark?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;
}
