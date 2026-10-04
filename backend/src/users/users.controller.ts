import { Controller, Get, Post, Body, Param, Patch, Delete, Inject, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from './schemas/user.schema.js';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN, UserRole.VIEWER, UserRole.MANUFACTURING_ADMIN, UserRole.CRANE_ADMIN, UserRole.LOCO_ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN, UserRole.VIEWER, UserRole.MANUFACTURING_ADMIN, UserRole.CRANE_ADMIN, UserRole.LOCO_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    const userRole = req.user.role;
    const userId = req.user._id;

    if (
      userId !== id &&
      userRole !== UserRole.WAGON_ADMIN &&
      userRole !== UserRole.TPT_RAIL_ADMIN
    ) {
      throw new ForbiddenException("You don't have permission to update this user.");
    }
    
    // Prevent updating role unless the user is an admin
    if (updateUserDto.role && userRole !== UserRole.WAGON_ADMIN && userRole !== UserRole.TPT_RAIL_ADMIN) {
        delete updateUserDto.role;
    }

    return this.usersService.update(id, updateUserDto);
  }

  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
