import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './users/users.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { AssetCategoriesModule } from './asset-categories/asset-categories.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { MovementsModule } from './movements/movements.module.js';
import { AuthModule } from './auth/auth.module.js';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { SystemModule } from './system/system.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { ShuntingProgramsModule } from './shunting-programs/shunting-programs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    LocationsModule,
    AssetCategoriesModule,
    AssetsModule,
    MovementsModule,
    AuthModule,
    SystemModule,
    AnalyticsModule,
    ShuntingProgramsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
