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

      this.logger.log(`LLM Request - systemPrompt: ${systemPrompt}`);
      this.logger.log(`LLM Request - prompt: ${prompt}`);

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: 'deepseek-v3',
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

      const result = response.data.choices[0].message.content;
      this.logger.log(`LLM Response: ${result}`);
      return result;
    } catch (error: any) {
      this.logger.error(`LLM call failed: ${error.message}`);
      if (error.response) {
        this.logger.error(`LLM Error Response: ${JSON.stringify(error.response.data)}`);
      }
      throw new Error(`LLM调用失败: ${error.message}`);
    }
  }

  async generateScript(projectName: string, style: string, description: string): Promise<{
    content: string;
    wordCount: number;
  }> {
    const systemPrompt = `你是专业的短剧剧本作家，擅长创作吸引人的故事剧本。请始终用中文返回结果。`;

    const prompt = `请为一部名为"${projectName}"的${style}风格短剧创作完整剧本。

用户描述：${description}

请生成一个完整的短剧剧本，包含：
1. 故事梗概（100字以内）
2. 分集大纲（3-5集）
3. 每集详细剧情描述

请直接以文本格式返回剧本内容，使用清晰的标题和分段。必须用中文输出所有内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const wordCount = response.length;
    return {
      content: response,
      wordCount,
    };
  }

  async splitEpisodes(scriptContent: string, episodeCount?: number): Promise<any[]> {
    const systemPrompt = `你是专业的短剧编剧，擅长将完整剧本拆分为合理的分集。请始终用中文返回结果。`;

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

请直接返回JSON，不要有其他内容。必须用中文输出所有内容。`;

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
    const systemPrompt = `你是专业的短剧角色设定专家，擅长根据剧本创作有特色的角色形象。请始终用中文返回结果。`;

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
7. 体型
8. 发型
9. 服饰
10. 装备/身上的东西
11. 适合的配音类型（温柔/浑厚/甜美/低沉等）

请以JSON格式返回：
{
  "characters": [
    {
      "name": "角色名称",
      "gender": "男/女",
      "ageGroup": "青年",
      "role": "角色类型/职业",
      "personality": "性格特点",
      "appearance": "外观描述（用于AI绘图）",
      "bodyType": "体型（如：高大/矮小/中等/肥胖/健壮等）",
      "hairstyle": "发型（如：短发/长发/卷发/光头等）",
      "clothing": "服饰（如：西装/休闲装/古装/制服等）",
      "equipment": "装备/身上的东西（如：背包/雨伞/手枪等）",
      "voiceType": "适合的配音类型"
    }
  ]
}

请直接返回JSON，不要有其他内容。必须用中文输出所有内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      return parsed.characters || [];
    } catch {
      return [];
    }
  }

  async generateScenes(scriptContent: string): Promise<any[]> {
    const systemPrompt = `你是专业的影视场景设计师，擅长根据剧本提取纯地点，并为每个地点生成极其详细、符合特定场所的真实场景描述。请始终用中文返回结果。`;

    const prompt = `请根据以下剧本内容，提取故事中涉及的所有【纯地点/场所】，并为每个地点生成极其详细、真实的环境描述。

剧本内容：
${scriptContent}

【任务】
1. 提取所有纯地点名称
2. 根据地点名称，生成极其详细、真实的环境描述

【地点名称的内涵】
- 地点名称本身就是最重要的线索！AI需要从名称推断这是什么地方
- 从名称推断这个场所的建筑类型、典型物品、光线氛围
- "道观内" → 道教徒修炼场所 → 三清像、香案、蒲团、烛台、经书、道教装饰
- "丛林深处" → 野外森林 → 密林、苔藓、树根、落叶、蜘蛛网
- "宫殿" → 帝王场所 → 华丽装饰、雕梁画栋、琉璃瓦、宫女痕迹
- AI需要像考古学家一样，从名称推断这个地方应该有什么

【描述（description）生成规则】
- 必须根据地点名称的内涵生成，不能从剧本复制
- 纯静态环境描写，禁止任何人物
- 描述要极其详细具体：至少60字，越详细越好
- 必须包含：光线氛围、具体物品的细节、质感、色彩、空间感

【禁止词汇】
绝对禁止出现在description中：人、人物、角色、众人、两人、三人、五人、敌人、朋友、对峙、打斗、交谈、说话、坐着、站着、休息、准备、发现、对话、活动、动作、行走、奔跑

请按以下JSON格式返回：
{
  "scenes": [
    {
      "location": "道观外（室外）",
      "description": "（极其详细的环境描写，至少60字，要符合道观这一特定场所的真实特征）",
      "timeOfDay": "白天/傍晚/夜晚",
      "weather": "晴朗/阴天/雨天",
      "elements": ["古树","石阶","枯藤","落叶"]
    }
  ]
}

【重要】location字段格式：地点（室内/室外），如"道观外（室外）"、"道观内（室内）"，括号内必须写"室内"或"室外"！

请直接返回JSON，只返回JSON，不要有任何其他内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    this.logger.log(`[LLM] generateScenes raw response: ${content.substring(0, 500)}...`);

    try {
      const parsed = JSON.parse(content);
      this.logger.log(`[LLM] parsed.scenes length: ${parsed.scenes?.length}, first scene keys: ${Object.keys(parsed.scenes?.[0] || {}).join(', ')}`);
      return parsed.scenes || [];
    } catch (e) {
      this.logger.error(`[LLM] generateScenes parse error: ${e}, content: ${content.substring(0, 200)}`);
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

请直接返回JSON，不要有其他内容。必须用中文输出所有内容。`;

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

  async generateStoryboardsForScene(
    scriptContent: string,
    sceneIndex: number,
    sceneName: string,
    sceneContent: string,
  ): Promise<{ storyboards: any[] }> {
    const systemPrompt = `你是一个专业的影视分镜师，擅长根据剧本场景生成分镜列表。请始终用中文返回结果。`;

    const prompt = `你是一个专业的影视分镜师。请根据以下剧本内容，为指定场景生成分镜列表。

【完整剧本上下文】
${scriptContent}

【当前场景信息】
场景序号：${sceneIndex + 1}
场景名称：${sceneName}
场景内容：${sceneContent}

请为当前场景生成分镜列表，每个分镜包含以下专业字段：
1. title: 镜头标题（如"开场-主视角"、"对话-正反打"等）
2. shotType: 景别（建立镜头/大全景/全景/中景/中近景/近景/特写/极特写/主观镜头/过肩镜头/双人镜头）
3. cameraAngle: 机位（平视/仰拍/俯拍/鸟瞰/肩扛视角/侧面/背面）
4. cameraMovement: 运镜（固定/推镜/拉镜/摇镜/移镜/跟拍/升降/手持）
5. durationSeconds: 镜头时长（秒），根据景别估算：建立镜头和大全景5秒左右，特写2秒，近景3秒，其他4秒
6. emotionTone: 情绪氛围（克制/紧张/温柔/压迫/孤独/浪漫/荒诞/热烈）
7. beat: 剧情节拍，描述这个镜头要表达的核心剧情内容
8. narrativePurpose: 叙事目的，说明这个镜头在叙事中的作用
9. dramaticConflict: 冲突焦点，这个镜头中的主要矛盾或张力
10. action: 画面动作，描述画面中人物的动作和场景变化
11. dialogue: 对白，原文对白原封不动保留
12. narration: 旁白/内心声，如有的话
13. charactersInShot: 出镜角色列表，从剧本中提取
14. imagePrompt: AI绘图提示词，详细描述画面内容，包括人物、动作、场景、氛围、构图、光线等

请以JSON格式返回：
{
  "storyboards": [
    {
      "title": "镜头标题",
      "shotType": "中景",
      "cameraAngle": "平视",
      "cameraMovement": "固定",
      "durationSeconds": 4,
      "emotionTone": "紧张",
      "beat": "剧情节拍描述",
      "narrativePurpose": "叙事目标",
      "dramaticConflict": "冲突焦点",
      "action": "画面动作描述",
      "dialogue": "对白内容",
      "narration": "旁白内容",
      "charactersInShot": ["角色1", "角色2"],
      "imagePrompt": "详细的AI绘图描述"
    }
  ]
}

请直接返回JSON，不要有其他内容。必须用中文输出所有内容。`;

    const response = await this.chat(prompt, systemPrompt);
    const content = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error: any) {
      this.logger.error(`Failed to parse storyboards: ${error.message}`);
      return { storyboards: [] };
    }
  }

  async formatScript(content: string): Promise<string> {
    const systemPrompt = `你是一个资深的影视编剧，擅长将故事性内容精炼成专业的标准剧本格式。请始终用中文返回结果。`;

    const prompt = `请将以下内容转换成标准剧本格式，要求：
1. 对话原封不动保留，不得省略或修改
2. 场景描述只保留有意义的动作和环境，对无意义的描述性文字进行删减或精简
3. 空境和气氛描写可适当精简，不重要则删除
4. 只在场景的地点或时间发生实质性变化时才换新场景，不要每句话一个场景
5. 每个场景包含：场景序号（如 1、2、3）、景别（特写/中景/全景/远景/近景/大特写）、场景描述
6. 使用标准剧本格式：场景标题（含内景/外景、具体地点、时间）、动作描述、对话等清晰分段
7. 必须用中文输出所有内容

标准格式示例：
【场景1】内景 咖啡厅-白天 中景
角色动作描写（精简，只保留有意义的）...
对话内容（原文保留）

【场景2】外景 街道-傍晚 全景
环境描写（精简）...
对话内容（原文保留）

以下是原始内容：
${content}

请直接返回转换后的标准剧本格式内容，不要添加任何解释说明。`;

    const response = await this.chat(prompt, systemPrompt);
    return response;
  }

  async expandScript(content: string, userPrompt: string): Promise<string> {
    const systemPrompt = `你是一个专业的编剧，擅长根据用户需求对剧本进行扩写。请始终用中文返回结果。`;

    const prompt = `你是一个专业编剧，请根据用户的提示词对以下剧本进行扩写。

【用户提示词】
${userPrompt}

【原始剧本】
${content}

扩写要求：
1. 对话必须原封不动保留，不得修改或省略
2. 在保留原文的基础上进行合理扩写，不要替换原文内容
3. 扩写的内容要符合剧本的专业格式
4. 场景变化时需要换场景并标注序号和景别
5. 必须用中文输出所有内容

请直接返回扩写后的剧本内容，不要添加任何解释说明。`;

    const response = await this.chat(prompt, systemPrompt);
    return response;
  }

  async enrichSceneDescription(
    description: string,
    location?: string,
    timeOfDay?: string,
    weather?: string,
  ): Promise<string> {
    const systemPrompt = `你是一个专业的AI绘图提示词优化专家，擅长将简短的场景描述丰富成详细、专业的AI绘图提示词。请始终用中文返回结果。`;

    const contextParts = [];
    if (location) contextParts.push(`地点：${location}`);
    if (timeOfDay) contextParts.push(`时间：${timeOfDay}`);
    if (weather) contextParts.push(`天气：${weather}`);
    const context = contextParts.length > 0 ? `\n场景上下文：\n${contextParts.join('\n')}` : '';

    const prompt = `请将以下场景描述丰富成详细的AI绘图提示词。这个提示词是给AI文生图模型用的，请用模型能理解的视觉描述语言。

【原始描述】
${description}
${context}

丰富要求：
1. 保留原描述的核心内容和氛围
2. 用AI绘图模型能理解的视觉描述词汇（如：暖色调、冷色调、柔和光线、强烈阴影、景深、虚化等）
3. 添加符合场景的物品细节、材质描述（如：木质桌面、丝绸窗帘、金属质感、玻璃反射、纹理细节）
4. 添加光影效果和色彩氛围描述
5. 添加环境细节（如：灰尘颗粒、雾气、光束、水面倒影、阴影层次）
6. 确保描述符合给定的时间、天气、场地等上下文
7. 只描述场景和环境，不要添加任何人物描述（如人物的外貌、表情、动作、服装等）
8. 只返回丰富后的提示词，不要添加解释说明
9. 必须用中文输出所有内容

请直接返回丰富后的提示词。`;

    const response = await this.chat(prompt, systemPrompt);
    return response;
  }
}
