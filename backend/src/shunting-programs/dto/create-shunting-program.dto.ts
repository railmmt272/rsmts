import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateShuntingProgramDto {
  @IsString()
  @IsNotEmpty()
  initialPosition: string;

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
}
