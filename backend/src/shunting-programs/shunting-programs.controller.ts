import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ShuntingProgramsService } from './shunting-programs.service.js';
import { CreateShuntingProgramDto } from './dto/create-shunting-program.dto.js';
import { UpdateShuntingProgramDto } from './dto/update-shunting-program.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';

@Controller('shunting-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShuntingProgramsController {
  constructor(private readonly shuntingProgramsService: ShuntingProgramsService) {}

  @Post()
  @Roles(UserRole.REPAIR_SUPERVISOR, UserRole.MANUFACTURING_SUPERVISOR, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)
  create(@Body() createShuntingProgramDto: CreateShuntingProgramDto, @CurrentUser() user: CurrentUserPayload) {
    return this.shuntingProgramsService.create(createShuntingProgramDto, user._id);
  }

  @Get()
  @Roles(UserRole.REPAIR_SUPERVISOR, UserRole.MANUFACTURING_SUPERVISOR, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)
  findAll() {
    return this.shuntingProgramsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.REPAIR_SUPERVISOR, UserRole.MANUFACTURING_SUPERVISOR, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)
  findOne(@Param('id') id: string) {
    return this.shuntingProgramsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.REPAIR_SUPERVISOR, UserRole.MANUFACTURING_SUPERVISOR, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)
  update(@Param('id') id: string, @Body() updateShuntingProgramDto: UpdateShuntingProgramDto) {
    return this.shuntingProgramsService.update(id, updateShuntingProgramDto);
  }

  @Delete(':id')
  @Roles(UserRole.REPAIR_SUPERVISOR, UserRole.MANUFACTURING_SUPERVISOR, UserRole.MANAGEMENT, UserRole.SYSTEM_ADMIN)
  remove(@Param('id') id: string) {
    return this.shuntingProgramsService.remove(id);
  }
}
