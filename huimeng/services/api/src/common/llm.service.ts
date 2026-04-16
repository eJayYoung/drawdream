import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  constructor() {
    this.apiKey = process.env.ALIYUN_API_KEY || 'sk-b6f2c7530aaf4ca1882cbfb8b7cb2e28';
  }

  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const messages: any[] = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'qwen-plus',
          messages,
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          timeout: 300000,
        }
      );

      return response.data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error(`LLM call failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`LLM调用失败: ${error.message}`);
    }
  }

  async generateScript(projectName: string, style: string, description: string): Promise<{
    content: string;
    wordCount: number;
  }> {
    const systemPrompt = `你是专业的短剧剧本作家，擅长创作吸引人的故事剧本。`;

    const prompt = `请为一部名为"${projectName}"的${style}风格短剧创作完整剧本。

用户描述：${description}

请生成一个完整的短剧剧本，包含：
1. 故事梗概（100字以内）
2. 分集大纲（3-5集）
3. 每集详细场景描述

请以JSON格式返回，结构如下：
{
  "title": "${projectName}",
  "summary": "故事梗概",
  "episodes": [
    {
      "number": 1,
      "title": "第1集标题",
      "summary": "本集概要",
      "scenes": [
        {
          "scene": 1,
          "location": "场景地点",
          "time": "时间",
          "characters": ["角色1", "角色2"],
          "action": "动作描述",
          "dialogue": "对话内容"
        }
      ]
    }
  ]
}

请直接返回JSON，不要有其他内容。注意：title字段必须使用"${projectName}"。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      const wordCount = content.length;
      return {
        content: JSON.stringify(parsed, null, 2),
        wordCount,
      };
    } catch {
      // 如果不是有效JSON，直接返回
      return {
        content,
        wordCount: content.length,
      };
    }
  }

  async splitEpisodes(scriptContent: string, episodeCount?: number): Promise<any[]> {
    const systemPrompt = `你是专业的短剧编剧，擅长将完整剧本拆分为合理的分集。`;

    let parsedScript: any;
    try {
      parsedScript = JSON.parse(scriptContent);
    } catch {
      throw new Error('剧本格式无效');
    }

    const prompt = `请将以下剧本拆分为${episodeCount || parsedScript.episodes?.length || 3}集。

剧本内容：
${JSON.stringify(parsedScript, null, 2)}

请为每一集生成：
1. 集标题
2. 本集概要
3. 详细场景列表（每个场景包含：地点、时间、角色、动作、对话）

请以JSON格式返回：
{
  "episodes": [
    {
      "number": 1,
      "title": "第1集标题",
      "summary": "本集概要",
      "estimatedDuration": 180,
      "scenes": [...]
    }
  ]
}

请直接返回JSON，不要有其他内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      return parsed.episodes || [];
    } catch {
      return [];
    }
  }

  async generateCharacters(scriptContent: string): Promise<any[]> {
    const systemPrompt = `你是专业的短剧角色设定专家，擅长根据剧本创作有特色的角色形象。`;

    const prompt = `请根据以下剧本内容，提取并生成所有主要角色的信息。

剧本内容：
${scriptContent}

请为每个角色生成：
1. 角色名称
2. 性别
3. 年龄阶段（儿童/青年/中年/老年）
4. 角色类型/职业
5. 性格特点
6. 外观描述（用于AI绘图）
7. 适合的配音类型（温柔/浑厚/甜美/低沉等）

请以JSON格式返回：
{
  "characters": [
    {
      "name": "角色名称",
      "gender": "男/女",
      "ageGroup": "青年",
      "role": "角色类型/职业",
      "personality": "性格特点",
      "appearance": "外观描述",
      "voiceType": "适合的配音类型"
    }
  ]
}

请直接返回JSON，不要有其他内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      return parsed.characters || [];
    } catch {
      return [];
    }
  }

  async generateStoryboardPrompt(episode: any, scene: any, style: string): Promise<string> {
    const prompt = `请为以下场景生成适合AI绘图的分镜描述。

剧集信息：${episode.title}
场景：${JSON.stringify(scene, null, 2)}
风格：${style}

请生成：
1. 分镜描述（用于AI绘图）：详细的画面描述，包括人物、动作、场景、氛围等
2. 镜头类型：特写/中景/全景/远景/建立镜头
3. 旁白/对话

请以JSON格式返回：
{
  "imagePrompt": "详细的AI绘图描述",
  "shotType": "medium",
  "narration": "旁白内容（如有）",
  "dialogue": "对话内容（如有）"
}

请直接返回JSON，不要有其他内容。`;

    const response = await this.chat(prompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return content;
    } catch {
      return JSON.stringify({
        imagePrompt: `${scene.location}, ${scene.action}, ${style} style`,
        shotType: 'medium',
        narration: scene.dialogue,
        dialogue: scene.dialogue,
      });
    }
  }
}
