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
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
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
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  update(@Param('code') code: string, @Body() updateLocationDto: UpdateLocationDto) {
    return this.locationsService.update(code, updateLocationDto);
  }

  @Delete(':code')
  @Roles(UserRole.WAGON_ADMIN, UserRole.TPT_RAIL_ADMIN)
  remove(@Param('code') code: string) {
    return this.locationsService.remove(code);
  }
}
