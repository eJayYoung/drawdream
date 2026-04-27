import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { LlmService } from '../common/llm.service';
import { ProjectService } from '../project/project.service';
import { ScriptsService } from '../scripts/scripts.service';
import { CharactersService } from '../characters/characters.service';
import { ScenesService } from '../scenes/scenes.service';
import { StoryboardsService } from '../storyboards/storyboards.service';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly projectService: ProjectService,
    private readonly scriptsService: ScriptsService,
    private readonly charactersService: CharactersService,
    private readonly scenesService: ScenesService,
    private readonly storyboardsService: StoryboardsService,
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
        title: '剧本 1',
        content: result.content,
        status: 'completed',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.scriptsService.create(script as any);

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

      const episodes: any[] = episodeData.map((ep: any, index: number) => ({
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
      }));

      this.logger.log(`Split into ${episodes.length} episodes`);

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

      // 只返回AI生成的数据，不保存到数据库
      // 等用户确认后由前端保存到数据库
      const charactersWithId = characters.map((char: any, index: number) => ({
        id: `char-${Date.now()}-${index}`,
        projectId,
        name: char.name || '',
        gender: char.gender,
        ageGroup: char.ageGroup,
        role: char.role,
        personality: char.personality,
        appearance: char.appearance,
        voiceType: char.voiceType,
        bodyType: char.bodyType,
        hairstyle: char.hairstyle,
        clothing: char.clothing,
        equipment: char.equipment,
        assets: [],
        status: 'pending' as const,
        orderIndex: index,
        isNew: true,
      }));

      this.logger.log(`Generated ${characters.length} characters (not saved to DB yet)`);
      return charactersWithId;
    } catch (error: any) {
      this.logger.error(`Failed to generate characters: ${error.message}`);
      throw error;
    }
  }

  async generateScenes(projectId: string, scriptContent: string): Promise<any[]> {
    try {
      this.logger.log(`Generating scenes for project ${projectId}`);

      const scenes = await this.llmService.generateScenes(scriptContent);
      this.logger.log(`[DEBUG] LLM returned scenes: ${JSON.stringify(scenes)}`);
      this.logger.log(`[DEBUG] scenes[0] keys: ${Object.keys(scenes[0] || {}).join(', ')}`);

      // 只返回AI生成的数据，不保存到数据库
      // 等用户确认后由前端保存到数据库
      // AI 返回的 location 格式为 "地点（室内/室外）"，需要解析出纯地点和室内/室外
      const scenesWithId = scenes.map((scene: any, index: number) => {
        // 解析 location: "道观外（室外）" → location: "室外", name: "道观外"
        const nameMatch = (scene.location || '').match(/^(.+)（(.+)）$/);
        const location = nameMatch ? nameMatch[2] : ''; // 室内或室外
        const pureName = nameMatch ? nameMatch[1] : (scene.location || '');
        return {
          id: `scene-${Date.now()}-${index}`,
          projectId,
          name: pureName,
          location,
          timeOfDay: scene.timeOfDay || '白天',
          weather: scene.weather || '晴朗',
          description: scene.description || '',
          elements: scene.elements || [],
          atmosphere: scene.atmosphere,
          imagePrompt: scene.imagePrompt,
          imageUrl: scene.imageUrl || '',
          status: 'pending' as const,
          orderIndex: index,
          isNew: true,
        };
      });
      this.logger.log(`[DEBUG] scenesWithId[0] location=${scenesWithId[0]?.location}`);

      this.logger.log(`Generated ${scenes.length} scenes (not saved to DB yet)`);
      return scenesWithId;
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
          id: `storyboard-${Date.now()}-${i}`,
          projectId,
          sceneNumber: i + 1,
          title: `镜头 ${i + 1}`,
          shotType: storyboardData.shotType || 'medium',
          beat: '',
          action: scene.action,
          imagePrompt: storyboardData.imagePrompt,
          narration: storyboardData.narration,
          dialogue: storyboardData.dialogue,
          durationSeconds: 5,
          source: 'ai' as const,
          status: 'pending' as const,
          orderIndex: i,
          isNew: true,
        };
        storyboards.push(storyboard);
      }

      // 不再保存到数据库，等用户确认后由前端保存
      this.logger.log(`Generated ${storyboards.length} storyboards (not saved to DB yet)`);
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
        id: `storyboard-${Date.now()}-${sceneIndex}-${index}`,
        projectId,
        sceneNumber: sceneIndex + 1,
        title: sb.title || `镜头 ${index + 1}`,
        shotType: sb.shotType || '中景',
        cameraAngle: sb.cameraAngle || '平视',
        cameraMovement: sb.cameraMovement || '固定',
        durationSeconds: sb.durationSeconds || 4,
        beat: sb.beat || '',
        action: sb.action || '',
        dialogue: sb.dialogue || '',
        narration: sb.narration || '',
        imagePrompt: sb.imagePrompt || '',
        source: 'ai',
        status: 'pending' as const,
        orderIndex: index,
        isNew: true,
      }));

      // 不再保存到数据库，等用户确认后由前端保存
      this.logger.log(`Generated ${storyboards.length} storyboards for scene ${sceneIndex + 1} (not saved to DB yet)`);
      return storyboards;
    } catch (error: any) {
      this.logger.error(`Failed to generate storyboards for scene: ${error.message}`);
      throw error;
    }
  }

  async generateStoryboards(
    projectId: string,
    options?: { autoGenerateImages?: boolean; style?: string },
  ): Promise<any[]> {
    // TODO: This method needs to be reimplemented with the new database structure
    // Episodes are now in their own table, so we need to fetch the script content
    // from the ScriptsService and generate storyboards based on that
    this.logger.warn(`generateStoryboards needs to be reimplemented for project ${projectId}`);
    return [];
  }

  async getStoryboards(episodeId: string): Promise<any[]> {
    return this.storyboardsService.findByEpisodeId(episodeId);
  }

  async updateStoryboard(id: string, data: any): Promise<any> {
    return this.storyboardsService.update(id, data);
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
    return null; // Episodes are now in their own table, accessed via EpisodesService
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
