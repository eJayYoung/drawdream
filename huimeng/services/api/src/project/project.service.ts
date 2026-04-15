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
    return project;
  }

  async create(userId: string, dto: any): Promise<any> {
    const project = {
      id: uuidv4(),
      userId,
      name: dto.name,
      description: dto.description,
      aspectRatio: dto.aspectRatio,
      style: dto.style,
      imageModel: dto.imageModel,
      videoModel: dto.videoModel,
      status: 'draft',
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
