import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity()
export class Project {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  userId: string;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'string', default: '16:9' })
  aspectRatio: string;

  @Property({ type: 'string', default: 'single' })
  projectType: string;

  @Property({ type: 'string', default: 'modern' })
  style: string;

  @Property({ type: 'string', default: 'sdxl' })
  imageModel: string;

  @Property({ type: 'string', default: 'svd' })
  videoModel: string;

  @Property({ type: 'string', default: 'draft' })
  status: string;

  @Property({ type: 'string', nullable: true })
  coverImageUrl?: string;

  @Property({ type: 'string', nullable: true })
  selectedScriptId?: string;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
