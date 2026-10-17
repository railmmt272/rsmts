import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WorkRegister, WorkStatus, TodoStatus } from './schemas/work-register.schema.js';
import { CreateWorkRegisterDto } from './dto/create-work-register.dto.js';
import { UpdateWorkRegisterDto } from './dto/update-work-register.dto.js';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto.js';
import { ShuntingProgram } from '../shunting-programs/schemas/shunting-program.schema.js';

const POPULATE_FIELDS = [
  { path: 'createdBy', select: 'name email role' },
  { path: 'statusHistory.changedBy', select: 'name email role' },
  { path: 'todos.updatedBy', select: 'name email role' },
  { path: 'shuntingProgram' },
  { path: 'todos.shuntingProgram' },
];

@Injectable()
export class WorkRegistersService {
  constructor(
    @InjectModel(WorkRegister.name) private workRegisterModel: Model<WorkRegister>,
    @InjectModel(ShuntingProgram.name) private shuntingProgramModel: Model<ShuntingProgram>,
  ) {}

  async create(dto: CreateWorkRegisterDto, userId: string): Promise<WorkRegister> {
    // Initial status is always NOT_ATTENDED per client requirements
    const initialStatus: WorkStatus = 'NOT_ATTENDED';

    const initialTodos = (dto.todos || []).map(t => ({
      task: t.task.trim(),
      status: 'NOT_COMPLETED' as TodoStatus,
      remark: t.remark?.trim() || '',
      shuntingProgram: t.shuntingProgramId ? new Types.ObjectId(t.shuntingProgramId) : undefined,
      updatedBy: new Types.ObjectId(userId),
      updatedAt: new Date(),
    }));

    const record = new this.workRegisterModel({
      date: dto.date ? new Date(dto.date) : new Date(),
      shift: dto.shift,
      status: initialStatus,
      remark: dto.remark?.trim() || '',
      shuntingProgram: dto.shuntingProgramId ? new Types.ObjectId(dto.shuntingProgramId) : undefined,
      todos: initialTodos,
      createdBy: new Types.ObjectId(userId),
      statusHistory: [
        {
          status: initialStatus,
          remark: dto.remark ? `Initial creation: ${dto.remark}` : 'Initial creation',
          changedBy: new Types.ObjectId(userId),
          changedAt: new Date(),
        },
      ],
    });

    const saved = await record.save();
    return saved.populate(POPULATE_FIELDS);
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
        .populate(POPULATE_FIELDS)
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
      .populate(POPULATE_FIELDS)
      .exec();

    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdateWorkRegisterDto, userId: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel.findById(id);
    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);

    const updateData: any = {};

    if (dto.shift) updateData.shift = dto.shift;
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.remark !== undefined) updateData.remark = dto.remark;

    if (dto.status && dto.status !== record.status) {
      const historyEntry = {
        status: dto.status as WorkStatus,
        remark: dto.remark ?? '',
        changedBy: new Types.ObjectId(userId),
        changedAt: new Date(),
      };
      updateData.status = dto.status;
      updateData.$push = { statusHistory: historyEntry };
    }

    const { $push, ...setData } = updateData;
    const mongoUpdate: any = { $set: setData };
    if ($push) mongoUpdate.$push = $push;

    const updated = await this.workRegisterModel
      .findByIdAndUpdate(id, mongoUpdate, { new: true })
      .populate(POPULATE_FIELDS)
      .exec();

    return updated!;
  }

  async addTodo(id: string, dto: CreateTodoDto, userId: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel.findById(id);
    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);

    const newTodo = {
      task: dto.task.trim(),
      status: 'NOT_COMPLETED' as TodoStatus,
      remark: dto.remark?.trim() || '',
      shuntingProgram: dto.shuntingProgramId ? new Types.ObjectId(dto.shuntingProgramId) : undefined,
      updatedBy: new Types.ObjectId(userId),
      updatedAt: new Date(),
    };

    record.todos.push(newTodo as any);
    await record.save();

    return this.findOne(id);
  }

  async updateTodo(id: string, todoId: string, dto: UpdateTodoDto, userId: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel.findById(id);
    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);

    const todo = (record.todos as any).id(todoId);
    if (!todo) throw new NotFoundException(`Todo #${todoId} not found in WorkRegister #${id}`);

    if (dto.task !== undefined) todo.task = dto.task.trim();
    if (dto.status !== undefined) todo.status = dto.status;
    if (dto.remark !== undefined) todo.remark = dto.remark.trim();
    todo.updatedBy = new Types.ObjectId(userId);
    todo.updatedAt = new Date();

    await record.save();
    return this.findOne(id);
  }

  async removeTodo(id: string, todoId: string): Promise<WorkRegister> {
    const record = await this.workRegisterModel.findById(id);
    if (!record) throw new NotFoundException(`WorkRegister #${id} not found`);

    (record.todos as any).pull({ _id: todoId });
    await record.save();

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.workRegisterModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`WorkRegister #${id} not found`);
  }

  async getPendingPrograms(): Promise<ShuntingProgram[]> {
    return this.shuntingProgramModel.find({ status: 'PENDING' }).sort({ createdAt: -1 }).exec();
  }
}
