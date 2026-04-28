// backend/src/services/dynamicDataService.ts

import { PrismaClient } from '@prisma/client';
import { AppConfig, EntityConfig } from '../types/config';
import { NotFoundError, ForbiddenError } from '../types/errors';

const prisma = new PrismaClient();

export class DynamicDataService {
  /**
   * List records for an entity with pagination, search, and filtering
   */
  async listRecords(params: {
    appId: string;
    entityId: string;
    page: number;
    pageSize: number;
    search?: string;
    sortField?: string;
    sortDir?: 'asc' | 'desc';
    userId?: string;
    isUserScoped?: boolean;
    filters?: any[];
  }) {
    const { appId, entityId, page, pageSize, search, sortField = 'createdAt', sortDir = 'desc', userId, isUserScoped, filters = [] } = params;
    const skip = (page - 1) * pageSize;

    const where: any = {
      appId,
      entityId,
      deletedAt: null,
    };

    if (isUserScoped && userId) {
      where.createdBy = userId;
    }

    // Note: Search and complex filtering are done in JS here because data is JSONB 
    // and we want to keep it database-agnostic for now.
    // For large datasets, use Prisma's JSON filtering or a search engine.
    const [records, total] = await Promise.all([
      prisma.dynamicRecord.findMany({
        where,
        skip,
        take: 1000, // Fetch a larger chunk for manual filtering if search/filters are present
        orderBy: { [sortField]: sortDir },
      }),
      prisma.dynamicRecord.count({ where }),
    ]);

    let filteredRecords = records;

    // Apply search
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredRecords = filteredRecords.filter(r => {
        const data = r.data as Record<string, unknown>;
        return Object.values(data).some(v =>
          String(v).toLowerCase().includes(lowerSearch)
        );
      });
    }

    // Apply filters
    if (filters.length > 0) {
      filteredRecords = filteredRecords.filter(r => {
        const data = r.data as Record<string, unknown>;
        return filters.every((f: { field: string; operator: string; value: unknown }) => {
          const val = data[f.field];
          switch (f.operator) {
            case 'eq': return val == f.value;
            case 'ne': return val != f.value;
            case 'contains': return String(val).toLowerCase().includes(String(f.value).toLowerCase());
            case 'gt': return Number(val) > Number(f.value);
            case 'lt': return Number(val) < Number(f.value);
            case 'in': return Array.isArray(f.value) && f.value.includes(val);
            default: return true;
          }
        });
      });
    }

    // Apply manual pagination after filtering
    const paginatedRecords = filteredRecords.slice(skip, skip + pageSize);

    return {
      data: paginatedRecords.map(r => ({ id: r.id, ...r.data as object, _createdAt: r.createdAt, _updatedAt: r.updatedAt })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    };
  }

  /**
   * Get a single record
   */
  async getRecord(appId: string, entityId: string, recordId: string) {
    const record = await prisma.dynamicRecord.findFirst({
      where: { id: recordId, appId, entityId, deletedAt: null },
    });

    if (!record) {
      throw new NotFoundError('Record not found');
    }

    return { id: record.id, ...record.data as object, _createdAt: record.createdAt, _updatedAt: record.updatedAt };
  }

  /**
   * Create a record
   */
  async createRecord(params: {
    appId: string;
    entityId: string;
    data: any;
    userId?: string;
  }) {
    const { appId, entityId, data, userId } = params;

    const record = await prisma.dynamicRecord.create({
      data: {
        appId,
        entityId,
        data,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return { id: record.id, ...data, _createdAt: record.createdAt, _updatedAt: record.updatedAt };
  }

  /**
   * Update a record
   */
  async updateRecord(params: {
    appId: string;
    entityId: string;
    recordId: string;
    data: any;
    userId?: string;
  }) {
    const { appId, entityId, recordId, data, userId } = params;

    const existing = await prisma.dynamicRecord.findFirst({
      where: { id: recordId, appId, entityId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('Record not found');
    }

    // Partial update
    const mergedData = { ...(existing.data as object), ...data };

    const updated = await prisma.dynamicRecord.update({
      where: { id: recordId },
      data: { 
        data: mergedData, 
        updatedBy: userId,
        updatedAt: new Date() 
      },
    });

    return { id: updated.id, ...mergedData, _createdAt: updated.createdAt, _updatedAt: updated.updatedAt };
  }

  /**
   * Delete a record (soft or hard)
   */
  async deleteRecord(appId: string, entityId: string, recordId: string, softDelete: boolean = true) {
    const where = { id: recordId, appId, entityId };
    
    const existing = await prisma.dynamicRecord.findFirst({ where });
    if (!existing) {
      throw new NotFoundError('Record not found');
    }

    if (softDelete) {
      await prisma.dynamicRecord.update({
        where: { id: recordId },
        data: { deletedAt: new Date() },
      });
    } else {
      await prisma.dynamicRecord.delete({
        where: { id: recordId },
      });
    }

    return true;
  }
}

export const dynamicDataService = new DynamicDataService();
