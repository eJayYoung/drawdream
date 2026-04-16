import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectService {
  private projects: Map<string, any> = new Map();
  private episodes: Map<string, any> = new Map();
  private characters: Map<string, any> = new Map();

  async findAllByUser(userId: string): Promise<any[]> {
    return Array.from(this.projects.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async findById(id: string): Promise<any> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error('项目不存在');
    }
    const episodes = Array.from(this.episodes.values())
      .filter((e) => e.projectId === id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const characters = Array.from(this.characters.values())
      .filter((c) => c.projectId === id);

    return {
      ...project,
      episodes,
      characters,
    };
  }

  async create(userId: string, dto: any): Promise<any> {
    const project = {
      id: uuidv4(),
      userId,
      name: dto.name,
      description: dto.description,
      aspectRatio: dto.aspectRatio || '16:9',
      style: dto.style || 'modern',
      imageModel: dto.imageModel || 'sdxl',
      videoModel: dto.videoModel || 'svd',
      status: 'draft',
      // 创作内容存储
      scriptContent: null,
      episodesData: [],
      charactersData: [],
      storyboardsData: [],
      imagesData: [],
      videoUrl: null,
      coverImageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async update(id: string, dto: any): Promise<any> {
    const project = await this.findById(id);
    Object.assign(project, dto, { updatedAt: new Date() });
    return project;
  }

  // 保存剧本内容
  async saveScript(id: string, scriptContent: any): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.scriptContent = scriptContent;
    project.updatedAt = new Date();
    return project;
  }

  // 保存分集内容
  async saveEpisodes(id: string, episodesData: any[]): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.episodesData = episodesData;
    project.updatedAt = new Date();

    for (let i = 0; i < episodesData.length; i++) {
      const epData = episodesData[i];
      const episode = {
        id: uuidv4(),
        projectId: id,
        episodeNumber: epData.episodeNumber || i + 1,
        title: epData.title,
        summary: epData.summary,
        scriptContent: typeof epData === 'string' ? epData : JSON.stringify(epData),
        estimatedDuration: epData.estimatedDuration || 180,
        status: 'completed',
        orderIndex: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.episodes.set(episode.id, episode);
    }

    return project;
  }

  // 保存角色内容
  async saveCharacters(id: string, charactersData: any[]): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.charactersData = charactersData;
    project.updatedAt = new Date();

    for (const charData of charactersData) {
      const character = {
        id: uuidv4(),
        projectId: id,
        name: charData.name,
        gender: charData.gender,
        ageGroup: charData.ageGroup,
        role: charData.role,
        personality: charData.personality,
        appearance: charData.appearance,
        voiceType: charData.voiceType,
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.characters.set(character.id, character);
    }

    return project;
  }

  // 保存分镜内容
  async saveStoryboards(id: string, storyboardsData: any[]): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.storyboardsData = storyboardsData;
    project.updatedAt = new Date();
    return project;
  }

  // 保存分镜图
  async saveImages(id: string, imagesData: any[]): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.imagesData = imagesData;
    project.updatedAt = new Date();
    return project;
  }

  // 保存成片
  async saveVideo(id: string, videoUrl: string, coverImageUrl?: string): Promise<any> {
    const project = this.projects.get(id);
    if (!project) throw new Error('项目不存在');
    project.videoUrl = videoUrl;
    if (coverImageUrl) project.coverImageUrl = coverImageUrl;
    project.status = 'completed';
    project.updatedAt = new Date();
    return project;
  }

  async delete(id: string): Promise<void> {
    this.projects.delete(id);
  }

  async findEpisodes(projectId: string): Promise<any[]> {
    return Array.from(this.episodes.values())
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createEpisode(projectId: string, dto: any): Promise<any> {
    const episode = {
      id: uuidv4(),
      projectId,
      episodeNumber: dto.episodeNumber,
      title: dto.title,
      scriptContent: dto.scriptContent,
      estimatedDuration: dto.estimatedDuration || 180,
      status: 'pending',
      orderIndex: dto.orderIndex || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.episodes.set(episode.id, episode);
    return episode;
  }

  async updateEpisode(id: string, dto: any): Promise<any> {
    const episode = this.episodes.get(id);
    if (!episode) throw new Error('Episode not found');
    Object.assign(episode, dto, { updatedAt: new Date() });
    return episode;
  }

  async findCharacters(projectId: string): Promise<any[]> {
    return Array.from(this.characters.values()).filter(
      (c) => c.projectId === projectId
    );
  }

  async createCharacter(projectId: string, dto: any): Promise<any> {
    const character = {
      id: uuidv4(),
      projectId,
      name: dto.name,
      description: dto.description,
      appearance: dto.appearance,
      voiceType: dto.voiceType || 'female_1',
      imageUrls: dto.imageUrls || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.characters.set(character.id, character);
    return character;
  }

  async updateCharacter(id: string, dto: any): Promise<any> {
    const character = this.characters.get(id);
    if (!character) throw new Error('Character not found');
    Object.assign(character, dto, { updatedAt: new Date() });
    return character;
  }

  async deleteCharacter(id: string): Promise<void> {
    this.characters.delete(id);
  }
}
