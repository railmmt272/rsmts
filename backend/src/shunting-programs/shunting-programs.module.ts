import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShuntingProgramsService } from './shunting-programs.service.js';
import { ShuntingProgramsController } from './shunting-programs.controller.js';
import { ShuntingProgram, ShuntingProgramSchema } from './schemas/shunting-program.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ShuntingProgram.name, schema: ShuntingProgramSchema }])
  ],
  controllers: [ShuntingProgramsController],
  providers: [ShuntingProgramsService],
})
export class ShuntingProgramsModule {}
