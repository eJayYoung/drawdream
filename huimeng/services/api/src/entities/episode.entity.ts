import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/decorators/legacy';
import { Project } from './project.entity';

@Entity()
export class Episode {
  @PrimaryKey({ type: 'string' })
  id: string;

  @ManyToOne(() => Project)
  project: Project;

  @Property({ type: 'number' })
  episodeNumber: number;

  @Property({ type: 'string' })
  title: string;

  @Property({ type: 'text', nullable: true })
  summary?: string;

  @Property({ type: 'text', nullable: true })
  scriptContent?: string;

  @Property({ type: 'number', default: 180 })
  estimatedDuration: number;

  @Property({ type: 'string', default: 'pending' })
  status: string;

  @Property({ type: 'number', default: 0 })
  orderIndex: number;

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
