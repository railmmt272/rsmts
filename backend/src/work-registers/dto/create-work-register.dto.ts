import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { SHIFT_OPTIONS, WORK_STATUS } from '../schemas/work-register.schema.js';
import { CreateTodoDto } from './todo.dto.js';

export class CreateWorkRegisterDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(SHIFT_OPTIONS)
  shift: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTodoDto)
  todos?: CreateTodoDto[];

  @IsOptional()
  @IsMongoId()
  shuntingProgramId?: string;

  @IsOptional()
  @IsString()
  @IsEnum(WORK_STATUS)
  status?: string;
}
