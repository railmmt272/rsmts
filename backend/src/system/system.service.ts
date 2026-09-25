import { Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';

@Injectable()
export class SystemService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: mongoose.Model<AuditLogDocument>,
    @InjectConnection() private connection: mongoose.Connection,
  ) {}

  async getHealthStatus() {
    const isConnected = this.connection.readyState === 1;
    return {
      status: isConnected ? 'ok' : 'error',
      database: isConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };
  }

  async getAuditLogs(limit = 100) {
    return this.auditLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async clearAuditLogs() {
    return this.auditLogModel.deleteMany({}).exec();
  }
}
