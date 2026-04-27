import { Injectable, Logger } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../entities';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);
  constructor(
    @InjectRepository(Project)
    private projectRepo: EntityRepository<Project>,
  ) {}

  async findAllByUser(userId: string): Promise<any[]> {
    const projects = await this.projectRepo.find(
      { userId },
      { orderBy: { updatedAt: 'DESC' } }
    );
    return projects.map((project) => this.mapProject(project));
  }

  private mapProject(project: Project) {
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
      selectedScriptId: raw.selectedScriptId,
      status: raw.status,
      createdAt: raw.createdAt || raw.created_at,
      updatedAt: raw.updatedAt || raw.updated_at,
    };
  }

  async findById(id: string): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) {
      throw new Error('项目不存在');
    }
    return this.mapProject(project);
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
      coverImageUrl: null,
      selectedScriptId: null,
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

  async updateSelectedScript(id: string, selectedScriptId: string): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.selectedScriptId = selectedScriptId;
    const em = this.projectRepo.getEntityManager() as any;
    await em.flush();
    return this.mapProject(project);
  }

  async updateCoverImage(id: string, coverImageUrl: string): Promise<any> {
    const project = await this.projectRepo.findOne({ id });
    if (!project) throw new Error('项目不存在');
    project.coverImageUrl = coverImageUrl;
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
}
