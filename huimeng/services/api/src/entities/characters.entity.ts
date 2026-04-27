import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/decorators/legacy';

export type CharacterStatus = 'idle' | 'generating' | 'completed' | 'failed';

@Entity()
@Index({ name: 'idx_characters_project_id', properties: ['projectId'] })
export class Character {
  @PrimaryKey({ type: 'string' })
  id: string;

  @Property({ type: 'string' })
  projectId: string;

  @Property({ type: 'string' })
  name: string;

  @Property({ type: 'string', nullable: true })
  gender?: string;

  @Property({ type: 'string', nullable: true })
  ageGroup?: string;

  @Property({ type: 'string', nullable: true })
  role?: string;

  @Property({ type: 'text', nullable: true })
  personality?: string;

  @Property({ type: 'text', nullable: true })
  appearance?: string;

  @Property({ type: 'string', nullable: true })
  voiceType?: string;

  @Property({ type: 'text', nullable: true })
  bodyType?: string;

  @Property({ type: 'text', nullable: true })
  hairstyle?: string;

  @Property({ type: 'text', nullable: true })
  clothing?: string;

  @Property({ type: 'text', nullable: true })
  equipment?: string;

  @Property({ type: 'json', nullable: true })
  assets?: any[];

  @Property({ type: 'number', default: 0 })
  orderIndex: number;

  @Property({ type: 'string', default: 'idle' })
  status: CharacterStatus;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
