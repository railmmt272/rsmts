import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class UpdateShuntingProgramDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shop?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  remark?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;
}
