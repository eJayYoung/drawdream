import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OssService } from './oss.service';
import { Response } from 'express';

@ApiTags('公共代理')
@Controller('proxy')
export class ProxyController {
  constructor(private readonly ossService: OssService) {}

  @Get('image')
  @ApiOperation({ summary: '图片代理' })
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).json({ error: 'url parameter is required' });
    }

    try {
      const { base64, contentType } = await this.ossService.proxyImage(url);
      const base64Data = base64.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to proxy image' });
    }
  }
}