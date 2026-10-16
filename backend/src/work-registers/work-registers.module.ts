import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkRegistersService } from './work-registers.service.js';
import { WorkRegistersController } from './work-registers.controller.js';
import { WorkRegister, WorkRegisterSchema } from './schemas/work-register.schema.js';
import { ShuntingProgram, ShuntingProgramSchema } from '../shunting-programs/schemas/shunting-program.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkRegister.name, schema: WorkRegisterSchema },
      { name: ShuntingProgram.name, schema: ShuntingProgramSchema },
    ]),
  ],
  controllers: [WorkRegistersController],
  providers: [WorkRegistersService],
})
export class WorkRegistersModule {}
