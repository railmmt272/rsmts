import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Inject } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';

@Controller('locations')
export class LocationsController {
  constructor(@Inject(LocationsService) private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.locationsService.create(createLocationDto);
  }

  @Get()
  findAll() {
    return this.locationsService.findAll();
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.locationsService.findOne(code);
  }

  @Patch(':code')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  update(@Param('code') code: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationsService.update(code, updateLocationDto);
  }

  @Delete(':code')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT)
  remove(@Param('code') code: string) {
    return this.locationsService.remove(code);
  }
}
