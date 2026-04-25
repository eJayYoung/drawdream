import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LlmService } from '../common/llm.service';
import { ProjectService } from '../project/project.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private scripts: Map<string, any> = new Map();
  private storyboards: Map<string, any> = new Map();
  private episodes: Map<string, any> = new Map();
  private projects: Map<string, any> = new Map();

  constructor(
    private readonly llmService: LlmService,
    private readonly projectService: ProjectService,
  ) {}

  async generateScript(
    projectId: string,
    prompt: string,
    projectName?: string,
    style?: string,
  ): Promise<{ content: string; wordCount: number }> {
    try {
      this.logger.log(`Generating script for project ${projectId}`);

      // 使用阿里百炼API生成剧本
      const result = await this.llmService.generateScript(
        projectName || '未命名项目',
        style || '现代',
        prompt,
      );

      const script = {
        id: uuidv4(),
        projectId,
        content: result.content,
        wordCount: result.wordCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.scripts.set(script.id, script);

      // 将剧本内容保存到项目表中
      await this.projectService.saveScript(projectId, result.content);

      this.logger.log(`Script generated and saved successfully for project ${projectId}`);
      return {
        content: result.content,
        wordCount: result.wordCount,
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate script: ${error.message}`);
      throw error;
    }
  }

  async splitEpisodes(
    projectId: string,
    scriptContent: string,
    episodeCount?: number,
  ): Promise<any[]> {
    try {
      this.logger.log(`Splitting episodes for project ${projectId}`);

      // 使用阿里百炼API进行智能分集
      const episodeData = await this.llmService.splitEpisodes(scriptContent, episodeCount);

      const episodes: any[] = episodeData.map((ep: any, index: number) => {
        const episode = {
          id: uuidv4(),
          projectId,
          episodeNumber: ep.number || index + 1,
          title: ep.title,
          summary: ep.summary,
          scriptContent: JSON.stringify(ep),
          estimatedDuration: ep.estimatedDuration || 180,
          status: 'pending',
          orderIndex: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.episodes.set(episode.id, episode);
        return episode;
      });

      // 将分集数据保存到项目表中
      await this.projectService.saveEpisodes(projectId, episodes);

      this.logger.log(`Split into ${episodes.length} episodes and saved`);
      return episodes;
    } catch (error: any) {
      this.logger.error(`Failed to split episodes: ${error.message}`);
      throw error;
    }
  }

  async generateCharacters(projectId: string, scriptContent: string): Promise<any[]> {
    try {
      this.logger.log(`Generating characters for project ${projectId}`);

      // 使用阿里百炼API生成角色
      const characters = await this.llmService.generateCharacters(scriptContent);

      // 将角色数据保存到项目表中
      this.logger.log(`Generated ${characters.length} characters for preview`);
      return characters;
    } catch (error: any) {
      this.logger.error(`Failed to generate characters: ${error.message}`);
      throw error;
    }
  }

  async generateScenes(projectId: string, scriptContent: string): Promise<any[]> {
    try {
      this.logger.log(`Generating scenes for project ${projectId}`);

      const scenes = await this.llmService.generateScenes(scriptContent);

      this.logger.log(`Generated ${scenes.length} scenes for preview`);
      return scenes;
    } catch (error: any) {
      this.logger.error(`Failed to generate scenes: ${error.message}`);
      throw error;
    }
  }

  async generateProjectStoryboards(
    projectId: string,
    scriptContent: string,
    style?: string,
  ): Promise<any[]> {
    try {
      this.logger.log(`Generating storyboards for project ${projectId}`);

      let scriptData: any;
      try {
        scriptData = typeof scriptContent === 'string'
          ? JSON.parse(scriptContent)
          : scriptContent;
      } catch {
        scriptData = { scenes: [] };
      }

      const scenes = scriptData.scenes || scriptData.episodes?.[0]?.scenes || [];
      const storyboardStyle = style || 'cinematic';
      const storyboards: any[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        let storyboardData: any;
        try {
          const llmResult = await this.llmService.generateStoryboardPrompt(
            { scriptContent },
            scene,
            storyboardStyle,
          );
          storyboardData = JSON.parse(llmResult);
        } catch {
          storyboardData = {
            imagePrompt: `${scene.location}, ${scene.action}, ${storyboardStyle} style, cinematic`,
            shotType: this.suggestShotType(scene),
            narration: scene.dialogue,
            dialogue: scene.dialogue,
          };
        }

        const storyboard = {
          id: uuidv4(),
          projectId,
          sceneNumber: i + 1,
          shotType: storyboardData.shotType || 'medium',
          description: scene.action,
          imagePrompt: storyboardData.imagePrompt,
          narration: storyboardData.narration,
          dialogue: storyboardData.dialogue,
          durationFrames: 48,
          orderIndex: i,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        storyboards.push(storyboard);
        this.storyboards.set(storyboard.id, storyboard);
      }

      await this.projectService.saveStoryboards(projectId, storyboards);

      this.logger.log(`Generated ${storyboards.length} storyboards for project ${projectId}`);
      return storyboards;
    } catch (error: any) {
      this.logger.error(`Failed to generate project storyboards: ${error.message}`);
      throw error;
    }
  }

  async generateStoryboardsForScene(
    projectId: string,
    scriptContent: string,
    sceneIndex: number,
    sceneName: string,
    sceneContent: string,
  ): Promise<any[]> {
    try {
      this.logger.log(`Generating storyboards for scene ${sceneIndex + 1} in project ${projectId}`);

      const result = await this.llmService.generateStoryboardsForScene(
        scriptContent,
        sceneIndex,
        sceneName,
        sceneContent,
      );

      const storyboards = (result.storyboards || []).map((sb: any, index: number) => ({
        id: uuidv4(),
        projectId,
        sceneNumber: sceneIndex + 1,
        title: sb.title || `镜头 ${index + 1}`,
        shotType: sb.shotType || '中景',
        cameraAngle: sb.cameraAngle || '平视',
        cameraMovement: sb.cameraMovement || '固定',
        durationSeconds: sb.durationSeconds || 4,
        emotionTone: sb.emotionTone || '',
        beat: sb.beat || '',
        narrativePurpose: sb.narrativePurpose || '',
        dramaticConflict: sb.dramaticConflict || '',
        action: sb.action || '',
        dialogue: sb.dialogue || '',
        narration: sb.narration || '',
        charactersInShot: sb.charactersInShot || [],
        imagePrompt: sb.imagePrompt || '',
        source: 'ai',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      this.logger.log(`Generated ${storyboards.length} storyboards for scene ${sceneIndex + 1}`);
      return storyboards;
    } catch (error: any) {
      this.logger.error(`Failed to generate storyboards for scene: ${error.message}`);
      throw error;
    }
  }

  async generateStoryboards(
    episodeId: string,
    options?: { autoGenerateImages?: boolean; style?: string },
  ): Promise<any[]> {
    try {
      const episode = this.episodes.get(episodeId);
      if (!episode) throw new Error('Episode not found');

      this.logger.log(`Generating storyboards for episode ${episodeId}`);

      let scriptData: any;
      try {
        scriptData = typeof episode.scriptContent === 'string'
          ? JSON.parse(episode.scriptContent)
          : episode.scriptContent;
      } catch {
        scriptData = { scenes: [] };
      }

      const scenes = scriptData.scenes || [];
      const style = options?.style || episode.style || 'cinematic';
      const storyboards: any[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        // 使用阿里百炼API生成更智能的分镜描述
        let storyboardData: any;
        try {
          const llmResult = await this.llmService.generateStoryboardPrompt(episode, scene, style);
          storyboardData = JSON.parse(llmResult);
        } catch {
          // 如果LLM调用失败，使用默认格式
          storyboardData = {
            imagePrompt: `${scene.location}, ${scene.action}, ${style} style, cinematic`,
            shotType: this.suggestShotType(scene),
            narration: scene.dialogue,
            dialogue: scene.dialogue,
          };
        }

        const storyboard = {
          id: uuidv4(),
          episodeId,
          sceneNumber: i + 1,
          shotType: storyboardData.shotType || 'medium',
          description: scene.action,
          imagePrompt: storyboardData.imagePrompt,
          narration: storyboardData.narration,
          dialogue: storyboardData.dialogue,
          durationFrames: 48,
          orderIndex: i,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        storyboards.push(storyboard);
        this.storyboards.set(storyboard.id, storyboard);
      }

      // 获取 episode 对应的 projectId 并保存分镜
      if (episode) {
        await this.projectService.saveStoryboards(episode.projectId, storyboards);
      }

      this.logger.log(`Generated ${storyboards.length} storyboards and saved`);
      return storyboards;
    } catch (error: any) {
      this.logger.error(`Failed to generate storyboards: ${error.message}`);
      throw error;
    }
  }

  async getStoryboards(episodeId: string): Promise<any[]> {
    return Array.from(this.storyboards.values())
      .filter((s) => s.episodeId === episodeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async updateStoryboard(id: string, data: any): Promise<any> {
    const storyboard = this.storyboards.get(id);
    if (!storyboard) throw new Error('Storyboard not found');
    Object.assign(storyboard, data, { updatedAt: new Date() });
    return storyboard;
  }

  async formatScript(content: string): Promise<string> {
    try {
      this.logger.log(`Formatting script to standard format`);
      const formattedContent = await this.llmService.formatScript(content);
      this.logger.log(`Script formatted successfully`);
      return formattedContent;
    } catch (error: any) {
      this.logger.error(`Failed to format script: ${error.message}`);
      throw error;
    }
  }

  async expandScript(content: string, userPrompt: string): Promise<string> {
    try {
      this.logger.log(`Expanding script with prompt: ${userPrompt}`);
      const expandedContent = await this.llmService.expandScript(content, userPrompt);
      this.logger.log(`Script expanded successfully`);
      return expandedContent;
    } catch (error: any) {
      this.logger.error(`Failed to expand script: ${error.message}`);
      throw error;
    }
  }

  async enrichSceneDescription(
    description: string,
    location?: string,
    timeOfDay?: string,
    weather?: string,
  ): Promise<string> {
    try {
      this.logger.log(`Enriching scene description`);
      const enriched = await this.llmService.enrichSceneDescription(
        description,
        location,
        timeOfDay,
        weather,
      );
      this.logger.log(`Scene description enriched successfully`);
      return enriched;
    } catch (error: any) {
      this.logger.error(`Failed to enrich scene description: ${error.message}`);
      throw error;
    }
  }

  async getEpisode(episodeId: string): Promise<any> {
    return this.episodes.get(episodeId);
  }

  private suggestShotType(scene: any): string {
    const action = (scene.action || '').toLowerCase();
    const dialogue = (scene.dialogue || '').toLowerCase();

    if (action.includes('特写') || action.includes('close')) {
      return 'close_up';
    }
    if (action.includes('远景') || action.includes('wide') || action.includes('全景')) {
      return 'wide';
    }
    if (action.includes('建立') || action.includes('establishing')) {
      return 'establishing';
    }

    return dialogue ? 'medium' : 'full';
  }
}
