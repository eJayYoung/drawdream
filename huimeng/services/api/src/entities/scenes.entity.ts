import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type SceneStatus = 'idle' | 'generating' | 'completed' | 'failed';

@Entity()
@Index({ name: 'idx_scenes_project_id', properties: ['projectId'] })
export class Scene {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'string', nullable: true })
  location?: string;

  @Property({ type: 'string', nullable: true })
  timeOfDay?: string;

  @Property({ type: 'string', nullable: true })
  weather?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'string', nullable: true })
  type?: string;

  @Property({ type: 'json', nullable: true })
  elements?: string[];

  @Property({ type: 'text', nullable: true })
  atmosphere?: string;

  @Property({ type: 'text', nullable: true })
  imagePrompt?: string;

  @Property({ type: 'string', nullable: true })
  imageUrl?: string;

  @Property({ type: 'json', nullable: true })
  assets?: any[];

  @Property({ type: 'number', default: 0 })
  orderIndex: number;

  @Property({ type: 'string', default: 'idle' })
  status: SceneStatus;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
