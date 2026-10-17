import { IsString, IsNotEmpty, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { TODO_STATUS } from '../schemas/work-register.schema.js';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  task: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsMongoId()
  shuntingProgramId?: string;
}

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsString()
  @IsEnum(TODO_STATUS)
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
