import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
} from '@nestjs/common';
import { ScriptsService } from './scripts.service';

@Controller('scripts')
export class ScriptsController {
  constructor(private readonly scriptsService: ScriptsService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.scriptsService.findByProjectId(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.scriptsService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    console.log('[ScriptsController] POST /api/scripts', JSON.stringify(data));
    return this.scriptsService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.scriptsService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.scriptsService.delete(id);
    return { success: true };
  }

  @Delete('project/:projectId')
  async deleteByProject(@Param('projectId') projectId: string) {
    await this.scriptsService.deleteByProjectId(projectId);
    return { success: true };
  }
}
