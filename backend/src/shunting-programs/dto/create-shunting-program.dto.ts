import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateShuntingProgramDto {
  @IsString()
  @IsNotEmpty()
  initialPosition: string;

  @IsOptional()
  @IsString()
  finalPosition?: string;

  @IsString()
  @IsNotEmpty()
  rsType: string;

  @IsString()
  @IsNotEmpty()
  rsNo: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['WAGON', 'LOCO', 'CRANE', 'MANUFACTURING'])
  shop: string;

  @IsString()
  @IsNotEmpty()
  remark: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
