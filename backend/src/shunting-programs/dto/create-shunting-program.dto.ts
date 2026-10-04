import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateShuntingProgramDto {
  @IsString()
  @IsNotEmpty()
  initialPosition: string;

  @IsString()
  @IsNotEmpty()
  assetCategory: string;

  @IsString()
  @IsNotEmpty()
  remark: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;
}
