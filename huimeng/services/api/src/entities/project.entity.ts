import { Entity, PrimaryKey, Property, OneToMany } from '@mikro-orm/decorators/legacy';
import { Collection } from '@mikro-orm/core';
import { Episode } from './episode.entity';
import { Character } from './character.entity';

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

  @Property({ type: 'json', nullable: true })
  scriptsData: any[];

  @Property({ type: 'text', nullable: true })
  scriptContent: string;

  @Property({ type: 'json', nullable: true })
  episodesData: any[];

  @Property({ type: 'json', nullable: true })
  charactersData: any[];

  @Property({ type: 'json', nullable: true })
  scenesData: any[];

  @Property({ type: 'json', nullable: true })
  storyboardsData: any[];

  @Property({ type: 'json', nullable: true })
  imagesData: any[];

  @Property({ type: 'string', nullable: true })
  videoUrl?: string;

  @Property({ type: 'string', nullable: true })
  coverImageUrl?: string;

  @Property({ type: 'number', nullable: true })
  selectedScriptIndex?: number;

  @OneToMany(() => Episode, (episode: Episode) => episode.project)
  episodes = new Collection<Episode>(this);

  @OneToMany(() => Character, (character: Character) => character.project)
  characters = new Collection<Character>(this);

  @Property({ type: 'date' })
  createdAt: Date = new Date();

  @Property({ type: 'date', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
