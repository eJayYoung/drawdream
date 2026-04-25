import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';
import {
  CreateMaterialLibraryDto,
  QueryMaterialLibraryDto,
  UpdateMaterialLibraryDto,
} from '../dto/materials.dto';
import { MaterialType, MaterialSource } from '../entities/materials.entity';

@ApiTags('素材管理')
@Controller('materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @ApiOperation({ summary: '创建素材记录' })
  async create(@Request() req: any, @Body() dto: CreateMaterialLibraryDto) {
    const material = await this.materialsService.create(req.user.id, dto);
    return this.mapMaterial(material);
  }

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  async findAll(
    @Request() req: any,
    @Query('fileType') fileType?: MaterialType,
    @Query('source') source?: MaterialSource,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize?: number,
  ) {
    const pageNum = page ?? 1;
    const pageSizeNum = pageSize ?? 20;
    const result = await this.materialsService.findAllByUser(req.user.id, {
      fileType,
      source,
      page: pageNum,
      pageSize: pageSizeNum,
    });
    return {
      items: result.items.map((m) => this.mapMaterial(m)),
      total: result.total,
      page: pageNum,
      pageSize: pageSizeNum,
      hasMore: (pageNum - 1) * pageSizeNum + result.items.length < result.total,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取素材详情' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const material = await this.materialsService.findById(id, req.user.id);
    return material ? this.mapMaterial(material) : { error: 'Material not found' };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新素材' })
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdateMaterialLibraryDto,
  ) {
    const material = await this.materialsService.update(id, req.user.id, dto);
    return material ? this.mapMaterial(material) : { error: 'Material not found' };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const success = await this.materialsService.delete(id, req.user.id);
    return { success };
  }

  private mapMaterial(m: any) {
    return {
      id: m.id,
      assetId: m.assetId,
      originFileName: m.originFileName,
      url: m.url,
      fileType: m.fileType,
      source: m.source,
      size: m.size,
      width: m.width,
      height: m.height,
      duration: m.duration,
      mimeType: m.mimeType,
      metadata: m.metadata,
      projectId: m.projectId,
      projectName: m.projectName,
      characterName: m.characterName,
      sceneName: m.sceneName,
      createdAt: m.createdAt,
    };
  }
}
