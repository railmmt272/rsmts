import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateShuntingProgramDto {
  @IsString()
  @IsNotEmpty()
  shop: string;

  @IsString()
  @IsNotEmpty()
  remark: string;

  @IsOptional()
  @IsEnum(['PENDING', 'DONE'])
  status?: string;
}
