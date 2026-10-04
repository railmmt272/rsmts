import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class UpdateShuntingProgramDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  initialPosition?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  assetCategory?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  remark?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;
}
