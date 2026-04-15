import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AspectRatio,
  ProjectStyle,
  ImageModel,
  VideoModel,
  VoiceType,
} from '@huimeng/shared-types';

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ['16:9', '9:16', '1:1'], description: '视频比例' })
  @IsEnum({ '16:9': '16:9', '9:16': '9:16', '1:1': '1:1' })
  aspectRatio!: AspectRatio;

  @ApiProperty({ enum: ['ancient', 'scifi', 'modern', 'fantasy', 'romance', 'horror'] })
  @IsEnum({ ancient: 'ancient', scifi: 'scifi', modern: 'modern', fantasy: 'fantasy', romance: 'romance', horror: 'horror' })
  style!: ProjectStyle;

  @ApiProperty({ enum: ['sdxl', 'sd15', 'sdxl-turbo', 'dalle3'] })
  @IsEnum({ sdxl: 'sdxl', sd15: 'sd15', 'sdxl-turbo': 'sdxl-turbo', dalle3: 'dalle3' })
  imageModel!: ImageModel;

  @ApiProperty({ enum: ['svd', 'animatediff', 'sora', 'pika'] })
  @IsEnum({ svd: 'svd', animatediff: 'animatediff', sora: 'sora', pika: 'pika' })
  videoModel!: VideoModel;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateEpisodeDto {
  @ApiProperty({ description: '集数' })
  @IsString()
  episodeNumber!: number;

  @ApiProperty({ description: '标题' })
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scriptContent?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  orderIndex?: number;
}

export class UpdateEpisodeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  scriptContent?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  estimatedDuration?: number;
}

export class CreateCharacterDto {
  @ApiProperty({ description: '角色名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '角色描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '外貌描述（用于生图）' })
  @IsString()
  @IsOptional()
  appearance?: string;

  @ApiProperty({ enum: ['male_1', 'male_2', 'female_1', 'female_2', 'narrator'] })
  @IsEnum({ male_1: 'male_1', male_2: 'male_2', female_1: 'female_1', female_2: 'female_2', narrator: 'narrator' })
  @IsOptional()
  voiceType?: VoiceType;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}

export class UpdateCharacterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  appearance?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voiceType?: VoiceType;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}
