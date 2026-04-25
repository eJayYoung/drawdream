import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type MaterialType = 'image' | 'video' | 'audio';
export type MaterialSource = 'upload' | 'workflow';

@Entity()
@Index({ name: 'idx_materials_user_id', properties: ['userId'] })
@Index({ name: 'idx_materials_file_type', properties: ['fileType'] })
@Index({ name: 'idx_materials_created_at', properties: ['createdAt'] })
export class MaterialLibrary {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  userId: string;

  @Property({ type: 'string' })
  assetId: string;

  @Property({ type: 'string' })
  originFileName: string;

  @Property({ type: 'string' })
  url: string;

  @Property({ type: 'string' })
  fileType: MaterialType;

  @Property({ type: 'string' })
  source: MaterialSource;

  @Property({ type: 'number' })
  size: number;

  @Property({ type: 'number', nullable: true })
  width?: number;

  @Property({ type: 'number', nullable: true })
  height?: number;

  @Property({ type: 'number', nullable: true })
  duration?: number;

  @Property({ type: 'string', nullable: true })
  mimeType?: string;

  @Property({ type: 'json', nullable: true })
  metadata?: any;

  @Property({ type: 'string', nullable: true })
  projectId?: string;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
