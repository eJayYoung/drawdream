import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
}
