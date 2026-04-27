import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectService } from './project.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('项目')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: '获取项目列表' })
  async findAll(@Request() req: any) {
    const projects = await this.projectService.findAllByUser(req.user.id);
    return projects.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      aspectRatio: p.aspectRatio,
      projectType: p.projectType,
      coverImageUrl: p.coverImageUrl,
      status: p.status,
      updatedAt: p.updatedAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: '获取项目详情' })
  async findOne(@Param('id') id: string) {
    return this.projectService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建项目' })
  async create(@Request() req: any, @Body() dto: any) {
    const project = await this.projectService.create(req.user.id, dto);
    return { id: project.id, name: project.name };
  }

  @Put(':id')
  @ApiOperation({ summary: '更新项目' })
  async update(@Param('id') id: string, @Body() dto: any) {
    const project = await this.projectService.update(id, dto);
    return { id: project.id };
  }

  @Put(':id/selected-script')
  @ApiOperation({ summary: '更新项目选中的剧本' })
  async updateSelectedScript(@Param('id') id: string, @Body() body: { selectedScriptId: string }) {
    await this.projectService.updateSelectedScript(id, body.selectedScriptId);
    return { success: true };
  }

  @Put(':id/cover')
  @ApiOperation({ summary: '更新项目封面图' })
  async updateCoverImage(@Param('id') id: string, @Body() body: { coverImageUrl: string }) {
    await this.projectService.updateCoverImage(id, body.coverImageUrl);
    return { success: true };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目' })
  async delete(@Param('id') id: string) {
    await this.projectService.delete(id);
    return { success: true };
  }
}
