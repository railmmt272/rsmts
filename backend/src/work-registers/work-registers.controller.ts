import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { WorkRegistersService } from './work-registers.service.js';
import { CreateWorkRegisterDto } from './dto/create-work-register.dto.js';
import { UpdateWorkRegisterDto } from './dto/update-work-register.dto.js';
import { CreateTodoDto, UpdateTodoDto } from './dto/todo.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';

@Controller('work-registers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkRegistersController {
  constructor(private readonly workRegistersService: WorkRegistersService) {}

  // ─── GET pending shunting programs (optional reference) ────────────────────
  @Get('pending-programs')
  getPendingPrograms() {
    return this.workRegistersService.getPendingPrograms();
  }

  // ─── CREATE Shift Register — restricted to TPT & Wagon admin ────────────────
  @Post()
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  create(
    @Body() createWorkRegisterDto: CreateWorkRegisterDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workRegistersService.create(createWorkRegisterDto, user._id);
  }

  // ─── READ ALL — open to all authenticated roles ───────────────────────────────
  @Get()
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('shift') shift?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workRegistersService.findAll({
      startDate,
      endDate,
      shift,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ─── READ ONE — open to all authenticated roles ───────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workRegistersService.findOne(id);
  }

  // ─── UPDATE Shift Register (overall status / shift / date / remark) ──────────
  @Patch(':id')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateWorkRegisterDto: UpdateWorkRegisterDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workRegistersService.update(id, updateWorkRegisterDto, user._id);
  }

  // ─── ADD To-Do Item to Shift Register ────────────────────────────────────────
  @Post(':id/todos')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  addTodo(
    @Param('id') id: string,
    @Body() createTodoDto: CreateTodoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workRegistersService.addTodo(id, createTodoDto, user._id);
  }

  // ─── UPDATE To-Do Item Status / Details ──────────────────────────────────────
  @Patch(':id/todos/:todoId')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  updateTodo(
    @Param('id') id: string,
    @Param('todoId') todoId: string,
    @Body() updateTodoDto: UpdateTodoDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.workRegistersService.updateTodo(id, todoId, updateTodoDto, user._id);
  }

  // ─── DELETE To-Do Item ───────────────────────────────────────────────────────
  @Delete(':id/todos/:todoId')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  removeTodo(
    @Param('id') id: string,
    @Param('todoId') todoId: string,
  ) {
    return this.workRegistersService.removeTodo(id, todoId);
  }

  // ─── DELETE Shift Register ───────────────────────────────────────────────────
  @Delete(':id')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  remove(@Param('id') id: string) {
    return this.workRegistersService.remove(id);
  }
}
