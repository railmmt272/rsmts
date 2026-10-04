import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShuntingProgram } from './schemas/shunting-program.schema.js';
import { CreateShuntingProgramDto } from './dto/create-shunting-program.dto.js';
import { UpdateShuntingProgramDto } from './dto/update-shunting-program.dto.js';

@Injectable()
export class ShuntingProgramsService {
  constructor(
    @InjectModel(ShuntingProgram.name) private shuntingProgramModel: Model<ShuntingProgram>,
  ) {}

  async create(createShuntingProgramDto: CreateShuntingProgramDto, userId: string): Promise<ShuntingProgram> {
    const newProgram = new this.shuntingProgramModel({
      ...createShuntingProgramDto,
      createdBy: userId,
    });
    return newProgram.save();
  }

  async findAllPaginated(page: number, limit: number): Promise<{ data: ShuntingProgram[], total: number, page: number, limit: number, totalPages: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.shuntingProgramModel.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.shuntingProgramModel.countDocuments()
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAll(): Promise<ShuntingProgram[]> {
    return this.shuntingProgramModel.find().populate('createdBy', 'name email').sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ShuntingProgram> {
    const program = await this.shuntingProgramModel.findById(id).populate('createdBy', 'name email').exec();
    if (!program) {
      throw new NotFoundException(`ShuntingProgram #${id} not found`);
    }
    return program;
  }

  async update(id: string, updateShuntingProgramDto: UpdateShuntingProgramDto): Promise<ShuntingProgram> {
    const updateData: any = { ...updateShuntingProgramDto };
    if (updateData.status === 'DONE') {
      updateData.dateMarkedDone = new Date();
    } else if (updateData.status === 'PENDING') {
      updateData.dateMarkedDone = null;
    }

    const existingProgram = await this.shuntingProgramModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!existingProgram) {
      throw new NotFoundException(`ShuntingProgram #${id} not found`);
    }

    return existingProgram;
  }

  async remove(id: string): Promise<void> {
    const result = await this.shuntingProgramModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`ShuntingProgram #${id} not found`);
    }
  }
}
