import { Controller, Get, Post, Body, Param, Patch, Delete, Inject } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from './schemas/user.schema.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT, UserRole.VIEWER, UserRole.OPS_MANAGEMENT)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT, UserRole.VIEWER, UserRole.OPS_MANAGEMENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
