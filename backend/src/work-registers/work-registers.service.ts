import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkRegister } from './schemas/work-register.schema.js';
import { CreateWorkRegisterDto } from './dto/create-work-register.dto.js';
import { UpdateWorkRegisterDto } from './dto/update-work-register.dto.js';
import { ShuntingProgram } from '../shunting-programs/schemas/shunting-program.schema.js';

const POPULATE_HISTORY = {
  path: 'statusHistory.changedBy',
  select: 'name email',
};

@Injectable()
export class WorkRegistersService {
  constructor(
    @InjectModel(WorkRegister.name) private workRegisterModel: Model<WorkRegister>,
    @InjectModel(ShuntingProgram.name) private shuntingProgramModel: Model<ShuntingProgram>,
  ) {}

  async create(dto: CreateWorkRegisterDto, userId: string): Promise<WorkRegister> {
    const program = await this.shuntingProgramModel.findById(dto.shuntingProgramId);
    if (!program) {
      throw new NotFoundException(`ShuntingProgram #${dto.shuntingProgramId} not found`);
    }

    const initialStatus = dto.status || 'NOT_ATTENDED';

    const record = new this.workRegisterModel({
      shuntingProgram: new Types.ObjectId(dto.shuntingProgramId),
      date: dto.date ? new Date(dto.date) : new Date(),
      shift: dto.shift,
      status: initialStatus,
      remark: dto.remark || '',
      createdBy: new Types.ObjectId(userId),
      statusHistory: [
        {
          status: initialStatus,
          remark: dto.remark || '',
          changedBy: new Types.ObjectId(userId),
          changedAt: new Date(),
        },
      ],
    });

    const saved = await record.save();
    return saved.populate([
      { path: 'shuntingProgram' },
      { path: 'createdBy', select: 'name email' },
      POPULATE_HISTORY,
    ]);
  }

  async findAll(query: {
    startDate?: string;
    endDate?: string;
    shift?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: WorkRegister[]; total: number; page: number; limit: number; totalPages: number }> {
    const filter: any = {};

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        const start = new Date(query.startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (query.shift) filter.shift = query.shift;
    if (query.status) filter.status = query.status;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.workRegisterModel
        .find(filter)
        .populate({ path: 'shuntingProgram' })
        .populate({ path: 'createdBy', select: 'name email' })
        .populate(POPULATE_HISTORY)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.workRegisterModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel
      .findById(id)
      .populate({ path: 'shuntingProgram' })
      .populate({ path: 'createdBy', select: 'name email' })
      .populate(POPULATE_HISTORY)
      .exec();

    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdateWorkRegisterDto, userId: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel.findById(id);
    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);

    const updateData: any = {};

    // Non-status fields
    if (dto.shift) updateData.shift = dto.shift;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.remark !== undefined) updateData.remark = dto.remark;

    // Status change → push to statusHistory
    if (dto.status && dto.status !== record.status) {
      const historyEntry = {
        status: dto.status,
        remark: dto.remark ?? '',
        changedBy: new Types.ObjectId(userId),
        changedAt: new Date(),
      };
      updateData.status = dto.status;
      updateData.$push = { statusHistory: historyEntry };

      // Sync ShuntingProgram
      if (dto.status === 'COMPLETED') {
        await this.shuntingProgramModel.findByIdAndUpdate(record.shuntingProgram, {
          status: 'DONE',
          dateMarkedDone: new Date(),
        });
      } else if (record.status === 'COMPLETED') {
        // Was completed, now changing back — revert
        await this.shuntingProgramModel.findByIdAndUpdate(record.shuntingProgram, {
          status: 'PENDING',
          dateMarkedDone: null,
        });
      }
    }

    const { $push, ...setData } = updateData;
    const mongoUpdate: any = { $set: setData };
    if ($push) mongoUpdate.$push = $push;

    const updated = await this.workRegisterModel
      .findByIdAndUpdate(id, mongoUpdate, { new: true })
      .populate({ path: 'shuntingProgram' })
      .populate({ path: 'createdBy', select: 'name email' })
      .populate(POPULATE_HISTORY)
      .exec();

    return updated!;
  }

  async remove(id: string): Promise<void> {
    const result = await this.workRegisterModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`WorkRegister #${id} not found`);
  }

  async getPendingPrograms(): Promise<ShuntingProgram[]> {
    return this.shuntingProgramModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).exec();
  }
}
