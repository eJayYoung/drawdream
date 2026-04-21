import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { Project } from './project.entity';

@Entity()
export class Character {
  @PrimaryKey({ type: 'string' })
  id: string;

  @ManyToOne(() => Project)
  project: Project;

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

  @Property({ type: 'json', nullable: true })
  imageUrls?: string[];

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
