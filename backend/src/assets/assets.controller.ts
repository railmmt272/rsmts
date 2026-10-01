import { Controller, Post, Body, Get, Param, Patch, Delete, Inject } from '@nestjs/common';
import { AssetsService } from './assets.service.js';
import { RegisterAssetDto } from './dto/register-asset.dto.js';
import { UpdateAssetStatusDto } from './dto/update-asset-status.dto.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../users/schemas/user.schema.js';

@Controller('assets')
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assetsService: AssetsService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT, UserRole.OPS_MANAGEMENT)
  registerAsset(@Body() dto: RegisterAssetDto, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.registerAsset(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findAll(user);
  }

  @Get(':assetNumber')
  findOne(@Param('assetNumber') assetNumber: string, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findOne(assetNumber, user);
  }

  @Patch(':assetNumber/status')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT, UserRole.OPS_MANAGEMENT)
  updateStatus(
    @Param('assetNumber') assetNumber: string,
    @Body() dto: UpdateAssetStatusDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.assetsService.updateStatus(assetNumber, dto, user);
  }

  @Delete(':assetNumber')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.MANAGEMENT, UserRole.OPS_MANAGEMENT)
  removeAsset(@Param('assetNumber') assetNumber: string, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.removeAsset(assetNumber, user);
  }
}
