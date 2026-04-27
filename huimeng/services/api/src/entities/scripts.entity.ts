import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type ScriptStatus = 'idle' | 'generating' | 'completed' | 'failed';

@Entity()
@Index({ name: 'idx_scripts_project_id', properties: ['projectId'] })
export class Script {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string' })
  title: string;

  @Property({ type: 'text', nullable: true })
  content?: string;

  @Property({ type: 'number', default: 0 })
  orderIndex: number;

  @Property({ type: 'string', default: 'idle' })
  status: ScriptStatus;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
