import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { v4 as uuidv4 } from 'uuid';
import { Project, Episode, Character } from '../entities';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepo: EntityRepository<Project>,
    @InjectRepository(Episode)
    private episodeRepo: EntityRepository<Episode>,
    @InjectRepository(Character)
    private characterRepo: EntityRepository<Character>,
  ) {}

  async findAllByUser(userId: string): Promise<any[]> {
    const projects = await this.projectRepo.find(
      { userId },
      { orderBy: { updatedAt: 'DESC' } }
    );
    return projects.map((project) => this.mapProject(project));
  }

  private mapProject(project: Project, episodes: any[] = [], characters: any[] = []) {
    const raw: any = JSON.parse(JSON.stringify(project));
    return {
      id: raw.id,
      userId: raw.userId,
      name: raw.name,
      description: raw.description,
      aspectRatio: raw.aspectRatio,
      projectType: raw.projectType,
      style: raw.style,
      imageModel: raw.imageModel,
      videoModel: raw.videoModel,
      coverImageUrl: raw.coverImageUrl,
      status: raw.status,
      scriptsData: raw.scriptsData || raw.scripts_data || [],
      scriptContent: raw.scriptContent || raw.script_content || '',
      selectedScriptIndex: raw.selectedScriptIndex ?? raw.selected_script_index,
      episodesData: raw.episodesData || raw.episodes_data || [],
      charactersData: raw.charactersData || raw.characters_data || [],
      scenesData: raw.scenesData || raw.scenes_data || [],
      storyboardsData: raw.storyboardsData || raw.storyboards_data || [],
      imagesData: raw.imagesData || raw.images_data || [],
      videoUrl: raw.videoUrl,
      episodes,
      characters,
      createdAt: raw.createdAt || raw.created_at,
      updatedAt: raw.updatedAt || raw.updated_at,
    };
  }

  async findById(id: string): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) {
      throw new Error('项目不存在');
    }
    const episodes = await this.episodeRepo.find(
      { project: { id } },
      { orderBy: { orderIndex: 'ASC' } }
    );
    const characters = await this.characterRepo.find({ project: { id } });

    return this.mapProject(
      project,
      JSON.parse(JSON.stringify(episodes)),
      JSON.parse(JSON.stringify(characters))
    );
  }

  async create(userId: string, dto: any): Promise<any> {
    const project = this.projectRepo.create({
      id: uuidv4(),
      userId,
      name: dto.name,
      description: dto.description,
      aspectRatio: dto.aspectRatio || '16:9',
      projectType: dto.projectType || 'single',
      style: dto.style || 'modern',
      imageModel: dto.imageModel || 'sdxl',
      videoModel: dto.videoModel || 'svd',
      status: 'draft',
      scriptsData: [],
      scriptContent: '',
      episodesData: [],
      charactersData: [],
      scenesData: [],
      storyboardsData: [],
      imagesData: [],
      videoUrl: null,
      coverImageUrl: null,
    } as any);
    const em = this.projectRepo.getEntityManager() as any;
    em.persist(project);
    await em.flush();
    return this.mapProject(project);
  }

  async update(id: string, dto: any): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    Object.assign(project, dto);
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveScript(id: string, scriptContent: any): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.scriptContent = scriptContent;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveScripts(id: string, scriptsData: any[], selectedScriptIndex?: number): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.scriptsData = scriptsData;
    if (selectedScriptIndex !== undefined) {
      project.selectedScriptIndex = selectedScriptIndex;
    }
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveEpisodes(id: string, episodesData: any[]): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.episodesData = episodesData;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveCharacters(id: string, charactersData: any[]): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.charactersData = charactersData;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveScenes(id: string, scenesData: any[]): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.scenesData = scenesData;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveStoryboards(id: string, storyboardsData: any[]): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.storyboardsData = storyboardsData;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveImages(id: string, imagesData: any[]): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.imagesData = imagesData;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async saveVideo(id: string, videoUrl: string, coverImageUrl?: string): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.videoUrl = videoUrl;
    if (coverImageUrl) project.coverImageUrl = coverImageUrl;
    project.status = 'completed';
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async delete(id: string): Promise<void> {
    const project = await this.projectRepo.findOne({ id });
    if (project) {
      const em = this.projectRepo.getEntityManager() as any;
      em.remove(project);
      await em.flush();
    }
  }

  async findEpisodes(projectId: string): Promise<any[]> {
    const episodes = await this.episodeRepo.find(
      { project: { id: projectId } },
      { orderBy: { orderIndex: 'ASC' } }
    );
    return JSON.parse(JSON.stringify(episodes));
  }

  async createEpisode(projectId: string, dto: any): Promise<any> {
    const project = await this.projectRepo.findOne({ id: projectId });
    if (!project) throw new Error('项目不存在');
    const episode = this.episodeRepo.create({
      id: uuidv4(),
      project,
      episodeNumber: dto.episodeNumber,
      title: dto.title,
      scriptContent: dto.scriptContent,
      estimatedDuration: dto.estimatedDuration || 180,
      status: 'pending',
      orderIndex: dto.orderIndex || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    const em = this.episodeRepo.getEntityManager() as any;
    em.persist(episode);
    await em.flush();
    return JSON.parse(JSON.stringify(episode));
  }

  async updateEpisode(id: string, dto: any): Promise<any> {
    const episode = await this.episodeRepo.findOne({ id });
    if (!episode) throw new Error('Episode not found');
    Object.assign(episode, dto);
    const em = this.episodeRepo.getEntityManager() as any;
    await em.flush();
    return JSON.parse(JSON.stringify(episode));
  }

  async findCharacters(projectId: string): Promise<any[]> {
    const characters = await this.characterRepo.find({ project: { id: projectId } });
    return JSON.parse(JSON.stringify(characters));
  }

  async createCharacter(projectId: string, dto: any): Promise<any> {
    const project = await this.projectRepo.findOne({ id: projectId });
    if (!project) throw new Error('项目不存在');
    const character = this.characterRepo.create({
      id: uuidv4(),
      project,
      name: dto.name,
      gender: dto.gender,
      ageGroup: dto.ageGroup,
      role: dto.role,
      personality: dto.personality,
      appearance: dto.appearance,
      voiceType: dto.voiceType || 'female_1',
      imageUrls: dto.imageUrls || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    const em = this.characterRepo.getEntityManager() as any;
    em.persist(character);
    await em.flush();
    return JSON.parse(JSON.stringify(character));
  }

  async updateCharacter(id: string, dto: any): Promise<any> {
    const character = await this.characterRepo.findOne({ id });
    if (!character) throw new Error('Character not found');
    Object.assign(character, dto);
    const em = this.characterRepo.getEntityManager() as any;
    await em.flush();
    return JSON.parse(JSON.stringify(character));
  }

  async deleteCharacter(id: string): Promise<void> {
    const character = await this.characterRepo.findOne({ id });
    if (character) {
      const em = this.characterRepo.getEntityManager() as any;
      em.remove(character);
      await em.flush();
    }
  }
}
