import { Injectable } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/postgresql';
import { InjectRepository } from '@mikro-orm/nestjs';
import { v4 as uuidv4 } from 'uuid';
import { MaterialLibrary } from '../entities/materials.entity';
import { CreateMaterialLibraryDto, QueryMaterialLibraryDto, UpdateMaterialLibraryDto } from '../dto/materials.dto';
import { ProjectService } from '../project/project.service';
import { ComfyUIService } from '../common/comfyui.service';

export interface MaterialWithNames {
  id: string;
  userId: string;
  assetId: string;
  originFileName: string;
  url: string;
  fileType: string;
  source: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
  metadata?: any;
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
  projectName?: string;
  characterName?: string;
  sceneName?: string;
}

@Injectable()
export class MaterialsService {
  constructor(
    @InjectRepository(MaterialLibrary)
    private materialRepo: EntityRepository<MaterialLibrary>,
    private readonly projectService: ProjectService,
    private readonly comfyUIService: ComfyUIService,
  ) {}

  async create(userId: string, dto: CreateMaterialLibraryDto): Promise<MaterialLibrary> {
    const material = this.materialRepo.create({
      id: uuidv4(),
      userId,
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const em = this.materialRepo.getEntityManager();
    await em.persist(material);
    await em.flush();
    return material;
  }

  async findAllByUser(
    userId: string,
    query: QueryMaterialLibraryDto,
  ): Promise<{ items: MaterialWithNames[]; total: number }> {
    const { fileType, source, page = 1, pageSize = 20 } = query;
    const where: any = { userId };
    if (fileType) where.fileType = fileType;
    if (source) where.source = source;

    const [items, total] = await this.materialRepo.findAndCount(where, {
      orderBy: { createdAt: 'DESC' },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    // Resolve names
    const itemsWithNames = await this.resolveNames(items);
    return { items: itemsWithNames, total };
  }

  async findById(id: string, userId: string): Promise<MaterialWithNames | null> {
    const material = await this.materialRepo.findOne({ id, userId });
    if (!material) return null;
    const [resolved] = await this.resolveNames([material]);
    return resolved;
  }

  private async resolveNames(materials: MaterialLibrary[]): Promise<MaterialWithNames[]> {
    if (materials.length === 0) return [];

    try {
      // Collect unique projectIds
      const projectIds = [...new Set(materials.map(m => m.projectId).filter((id): id is string => Boolean(id)))];

      console.log('[resolveNames] materials count:', materials.length);
      console.log('[resolveNames] projectIds:', projectIds);
      console.log('[resolveNames] sample metadata:', materials[0]?.metadata);

      // Collect characterIds and sceneIds from metadata
      const characterIds = materials.map(m => m.metadata?.characterId).filter((id): id is string => Boolean(id));
      const sceneIds = materials.map(m => m.metadata?.sceneId).filter((id): id is string => Boolean(id));

      // Batch fetch projects
      const projectsMap = new Map<string, any>();
      for (const projectId of projectIds) {
        try {
          const project = await this.projectService.findById(projectId);
          console.log('[resolveNames] found project:', projectId, project?.name);
          if (project) {
            projectsMap.set(projectId, project);
          }
        } catch (e: any) {
          console.log('[resolveNames] project not found:', projectId, e.message);
          // Project not found, skip
        }
      }

      // Map materials to include names
      const result = materials.map(material => {
        const project = material.projectId ? projectsMap.get(material.projectId) : null;
        let characterName: string | undefined;
        let sceneName: string | undefined;

        if (project) {
          // Find character name from charactersData
          if (material.metadata?.characterId) {
            const character = project.charactersData?.find(
              (c: any) => c.id === material.metadata.characterId
            );
            characterName = character?.name;
          }
          // Find scene name from scenesData
          if (material.metadata?.sceneId) {
            const scene = project.scenesData?.find(
              (s: any) => s.id === material.metadata.sceneId
            );
            sceneName = scene?.name;
          }
        }

        return {
          id: material.id,
          userId: material.userId,
          assetId: material.assetId,
          originFileName: material.originFileName,
          url: material.url,
          fileType: material.fileType,
          source: material.source,
          size: material.size,
          width: material.width,
          height: material.height,
          duration: material.duration,
          mimeType: material.mimeType,
          metadata: material.metadata,
          projectId: material.projectId,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
          projectName: project?.name,
          characterName,
          sceneName,
        };
      });

      console.log('[resolveNames] result sample:', result[0]?.projectName, result[0]?.characterName, result[0]?.sceneName);
      return result;
    } catch (e: any) {
      console.error('[resolveNames] error:', e);
      return materials.map(material => ({
        id: material.id,
        userId: material.userId,
        assetId: material.assetId,
        originFileName: material.originFileName,
        url: material.url,
        fileType: material.fileType,
        source: material.source,
        size: material.size,
        width: material.width,
        height: material.height,
        duration: material.duration,
        mimeType: material.mimeType,
        metadata: material.metadata,
        projectId: material.projectId,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        projectName: undefined,
        characterName: undefined,
        sceneName: undefined,
      }));
    }
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateMaterialLibraryDto,
  ): Promise<MaterialLibrary | null> {
    const material = await this.materialRepo.findOne({ id, userId });
    if (!material) return null;
    if (dto.originFileName) material.originFileName = dto.originFileName;
    if (dto.metadata) material.metadata = { ...material.metadata, ...dto.metadata };
    const em = this.materialRepo.getEntityManager();
    await em.flush();
    return material;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const material = await this.materialRepo.findOne({ id, userId });
    if (!material) return false;

    // 删除 ComfyUI 上的资产
    if (material.assetId) {
      await this.comfyUIService.deleteAsset(material.assetId);
    }

    const em = this.materialRepo.getEntityManager();
    em.remove(material);
    await em.flush();
    return true;
  }

  async batchCreate(userId: string, items: CreateMaterialLibraryDto[]): Promise<MaterialLibrary[]> {
    const materials = items.map((dto) => {
      const material = this.materialRepo.create({
        id: uuidv4(),
        userId,
        assetId: dto.assetId,
        originFileName: dto.originFileName,
        url: dto.url,
        fileType: dto.fileType,
        source: dto.source,
        size: dto.size,
        width: dto.width,
        height: dto.height,
        duration: dto.duration,
        mimeType: dto.mimeType,
        metadata: dto.metadata || null,
        projectId: dto.projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return material;
    });
    const em = this.materialRepo.getEntityManager();
    await em.persist(materials);
    await em.flush();
    return materials;
  }
}
