import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiTags('素材管理')
@Controller('materials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: '获取素材列表' })
  async findAll(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const result = await this.mediaService.findAllByUser(req.user.id, {
      type,
      page: page ? parseInt(page as any) : 1,
      pageSize: pageSize ? parseInt(pageSize as any) : 20,
    });

    return {
      items: result.items.map((m: any) => ({
        id: m.id,
        filename: m.filename,
        url: this.mediaService.getSignedUrl(m.url),
        type: m.type,
        size: m.size,
        width: m.width,
        height: m.height,
        duration: m.duration,
        createdAt: m.createdAt,
      })),
      total: result.total,
      page: page || 1,
      pageSize: pageSize || 20,
    };
  }

  @Post('upload')
  @ApiOperation({ summary: '上传素材' })
  async upload(
    @Request() req: any,
    @Body() body: { filename: string; type: string; size?: number },
  ) {
    const material = await this.mediaService.upload(
      req.user.id,
      body,
      body.type || 'image',
    );
    return {
      id: material.id,
      filename: material.filename,
      url: this.mediaService.getSignedUrl(material.url),
      type: material.type,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除素材' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.mediaService.delete(id, req.user.id);
    return { success: true };
  }
}
