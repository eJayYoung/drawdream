import { MaterialType, MaterialSource } from '../entities/materials.entity';

export class CreateMaterialLibraryDto {
  assetId: string;
  originFileName: string;
  url: string;
  fileType: MaterialType;
  source: MaterialSource;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
  metadata?: Record<string, any>;
  projectId?: string;
}

export class QueryMaterialLibraryDto {
  fileType?: MaterialType;
  source?: MaterialSource;
  page?: number;
  pageSize?: number;
}

export class UpdateMaterialLibraryDto {
  originFileName?: string;
  metadata?: Record<string, any>;
}
