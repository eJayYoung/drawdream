import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private client: S3Client;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('ALIYUN_OSS_ENDPOINT', '');
    this.client = new S3Client({
      credentials: {
        accessKeyId: this.configService.get<string>('ALIYUN_OSS_ACCESS_KEY', ''),
        secretAccessKey: this.configService.get<string>('ALIYUN_OSS_SECRET_KEY', ''),
      },
      endpoint: `https://${endpoint}`,
      region: this.configService.get<string>('ALIYUN_OSS_REGION', 'ningbo1'),
      forcePathStyle: true, // S3 兼容存储需要此选项
    });
  }

  async uploadBuffer(buffer: Buffer, filename: string, contentType: string): Promise<string> {
    const objectKey = `huimeng/assets/${Date.now()}-${filename}`;

    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.configService.get<string>('ALIYUN_OSS_BUCKET', ''),
          Key: objectKey,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
        }),
      );

      const endpoint = this.configService.get<string>('ALIYUN_OSS_ENDPOINT', 'eos-ningbo-1.cmecloud.cn');
      const bucket = this.configService.get<string>('ALIYUN_OSS_BUCKET', 'huimeng-hz');
      const url = `https://${bucket}.${endpoint}/${objectKey}`;

      this.logger.log(`Uploaded to OBS: ${url}, ETag: ${result.ETag}`);
      return url;
    } catch (error: any) {
      this.logger.error(`OBS upload failed: ${error.message}`);
      throw error;
    }
  }

  async proxyImage(imageUrl: string): Promise<{ base64: string; contentType: string }> {
    try {
      this.logger.log(`[OssService] proxyImage: fetching ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const contentType = (response.headers['content-type'] as string) || 'image/jpeg';
      const base64 = Buffer.from(response.data, 'binary').toString('base64');

      this.logger.log(`[OssService] proxyImage: success, size=${response.data.length}, type=${contentType}`);

      return {
        base64: `data:${contentType};base64,${base64}`,
        contentType,
      };
    } catch (error: any) {
      this.logger.error(`[OssService] proxyImage failed: ${error.message}`);
      throw new BadRequestException(`图片获取失败: ${error.message}`);
    }
  }
}
