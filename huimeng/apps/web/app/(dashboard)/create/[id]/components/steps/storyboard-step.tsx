"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Clapperboard,
  CopyPlus,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ErrorBanner } from "../error-banner";
import { useCreateWorkflowStore } from "../../workflow-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_NEGATIVE_PROMPT =
  "low quality, blurry, watermark, subtitle, text, malformed hands";

type StoryboardItem = {
  id: string;
  episodeId?: string;
  title: string;
  shotNumber: number;
  sceneNumber: number;
  sceneId: string;
  sceneLabel: string;
  scriptId: string;
  scriptTitle: string;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  durationSeconds: number;
  composition: string;
  lens: string;
  emotionTone: string;
  charactersInShot: string[];
  selectedCharacterAssetIds: string[];
  selectedSceneAssetIds: string[];
  imagePrompt: string;
  negativePrompt: string;
  imageUrl: string;
  comfyAssetId: string;
  allImageUrls: string[];
  allComfyAssetIds: string[];
  generationStatus: "idle" | "queued" | "generating" | "completed" | "failed";
  generationTaskId: string;
  generationTaskType: string;
  generatedAt: string;
  source: "manual" | "ai";
  createdAt: string;
  updatedAt: string;
};

type AssetOption = {
  id: string;
  url: string;
  label: string;
  sourceName: string;
  meta?: string;
};

const SHOT_TYPES = [
  "建立镜头",
  "大全景",
  "全景",
  "中景",
  "中近景",
  "近景",
  "特写",
  "极特写",
  "主观镜头",
  "过肩镜头",
  "双人镜头",
];

const CAMERA_ANGLES = [
  "平视",
  "仰拍",
  "俯拍",
  "鸟瞰",
  "肩扛视角",
  "侧面",
  "背面",
];

const CAMERA_MOVEMENTS = [
  "固定",
  "推镜",
  "拉镜",
  "摇镜",
  "移镜",
  "跟拍",
  "升降",
  "手持",
];

const EMOTIONS = [
  "克制",
  "紧张",
  "温柔",
  "压迫",
  "孤独",
  "浪漫",
  "荒诞",
  "热烈",
];

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

const sanitizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\uFFFD/g, "")
    .trim();
};

const uniqueList = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const normalizeNumber = (value: unknown, fallback: number) => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue > 0 ? nextValue : fallback;
};

const getScriptContent = (script: any) => {
  if (!script?.content) return "";
  return typeof script.content === "string"
    ? script.content
    : JSON.stringify(script.content);
};

const parseScriptToScenes = (scriptContent: string): { name: string; content: string }[] => {
  if (!scriptContent) return [];

  const scenes: { name: string; content: string }[] = [];

  // 尝试解析为JSON（如果剧本已经结构化）
  try {
    const parsed = JSON.parse(scriptContent);
    if (Array.isArray(parsed.scenes)) {
      return parsed.scenes.map((scene: any, index: number) => ({
        name: scene.name || scene.location || `场景 ${index + 1}`,
        content: scene.description || scene.content || JSON.stringify(scene),
      }));
    }
    if (Array.isArray(parsed.episodes)) {
      const allScenes: { name: string; content: string }[] = [];
      parsed.episodes.forEach((episode: any, epIndex: number) => {
        if (Array.isArray(episode.scenes)) {
          episode.scenes.forEach((scene: any, sceneIndex: number) => {
            allScenes.push({
              name: scene.name || scene.location || `场景 ${sceneIndex + 1}`,
              content: scene.description || scene.content || JSON.stringify(scene),
            });
          });
        }
      });
      if (allScenes.length > 0) return allScenes;
    }
  } catch {
    // 不是JSON格式，按文本处理
  }

  // 按场景标记分割（支持多种格式）
  // 格式1: 【场景1】内景 咖啡厅-白天
  // 格式2: 场景1：或 Scene 1:
  // 格式3: 以 "场景" 开头的新段落
  const scenePatterns = [
    /【场景(\d+)】?\s*(.*?)(?=(?:【场景|$))/gi,
    /场景\s*(\d+)[:：]\s*(.*?)(?=(?:场景\s*\d+[:：]|$))/gi,
    /(第?\s*(\d+)\s*[集场场景][\s:：])(.*?)(?=(?:第?\s*(\d+)\s*[集场场景][\s:：]|$))/gi,
  ];

  let sceneTexts: string[] = [];
  let matched = false;

  // 尝试按场景标记分割
  for (const pattern of scenePatterns) {
    const matches = [...scriptContent.matchAll(pattern)];
    if (matches.length > 0) {
      matched = true;
      let lastIndex = 0;
      matches.forEach((match) => {
        const sceneName = match[1] ? `场景 ${match[1]}` : `场景 ${sceneTexts.length + 1}`;
        const startIndex = match.index || 0;
        if (startIndex > lastIndex) {
          sceneTexts.push(scriptContent.slice(lastIndex, startIndex));
        }
        sceneTexts.push(match[0]);
        lastIndex = startIndex + match[0].length;
      });
      if (lastIndex < scriptContent.length) {
        sceneTexts.push(scriptContent.slice(lastIndex));
      }
      break;
    }
  }

  // 如果没有匹配到场景标记，按段落分割
  if (!matched) {
    const paragraphs = scriptContent.split(/\n\n+/);
    let currentScene = "";
    let sceneCount = 0;

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // 检查是否是场景标题
      if (/^(场景|第|\d+[.、])/.test(trimmed) || /【/.test(trimmed)) {
        if (currentScene) {
          sceneCount++;
          scenes.push({
            name: `场景 ${sceneCount}`,
            content: currentScene.trim(),
          });
          currentScene = "";
        }
        // 提取场景名称
        const nameMatch = trimmed.match(/^(【?场景[^\]】]*】?)/);
        const sceneName = nameMatch ? nameMatch[1].replace(/【|】/g, "") : `场景 ${sceneCount + 1}`;
        currentScene = trimmed;
        sceneCount++;
        scenes.push({
          name: sceneName,
          content: "",
        });
        currentScene = "";
      } else {
        if (scenes.length > 0) {
          scenes[scenes.length - 1].content += (scenes[scenes.length - 1].content ? "\n" : "") + trimmed;
        } else {
          currentScene += (currentScene ? "\n" : "") + trimmed;
        }
      }
    }

    if (currentScene.trim()) {
      sceneCount++;
      scenes.push({
        name: `场景 ${sceneCount}`,
        content: currentScene.trim(),
      });
    }
  } else {
    // 处理按场景标记分割的结果
    let currentContent = "";
    for (const text of sceneTexts) {
      const trimmed = text.trim();
      if (!trimmed) continue;

      const sceneMatch = trimmed.match(/^(?:【)?场景(\d+)[】]?\s*(.*)/);
      if (sceneMatch) {
        if (currentContent) {
          scenes.push({
            name: `场景 ${scenes.length + 1}`,
            content: currentContent.trim(),
          });
        }
        currentContent = sceneMatch[2] || "";
      } else {
        currentContent += (currentContent ? "\n" : "") + trimmed;
      }
    }
    if (currentContent.trim()) {
      scenes.push({
        name: `场景 ${scenes.length + 1}`,
        content: currentContent.trim(),
      });
    }
  }

  // 如果还是没有找到场景，按段落数量均分
  if (scenes.length === 0) {
    const paragraphs = scriptContent.split(/\n\n+/).filter((p) => p.trim());
    const chunkSize = Math.ceil(paragraphs.length / 3);
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize).join("\n\n");
      if (chunk.trim()) {
        scenes.push({
          name: `场景 ${Math.floor(i / chunkSize) + 1}`,
          content: chunk.trim(),
        });
      }
    }
  }

  return scenes.filter((s) => s.content.trim());
};

const inferShotType = (value: string) => {
  const text = value.toLowerCase();
  if (text.includes("极特写") || text.includes("extreme close")) {
    return "极特写";
  }
  if (text.includes("特写") || text.includes("close")) return "特写";
  if (text.includes("近景")) return "近景";
  if (text.includes("中近景")) return "中近景";
  if (text.includes("大全景") || text.includes("extreme wide")) return "大全景";
  if (text.includes("全景") || text.includes("wide")) return "全景";
  if (text.includes("建立") || text.includes("establish")) return "建立镜头";
  if (text.includes("过肩") || text.includes("over the shoulder")) {
    return "过肩镜头";
  }
  if (text.includes("主观") || text.includes("point of view")) {
    return "主观镜头";
  }
  return "中景";
};

const inferDuration = (shotType: string) => {
  if (shotType.includes("建立") || shotType.includes("大全景")) return 5;
  if (shotType.includes("特写")) return 2;
  if (shotType.includes("近景")) return 3;
  return 4;
};

const buildPromptFromStoryboard = (storyboard: Partial<StoryboardItem>) =>
  [
    "电影分镜预览画面",
    storyboard.sceneLabel ? `场景 ${storyboard.sceneLabel}` : "",
    storyboard.shotType ? `景别 ${storyboard.shotType}` : "",
    storyboard.cameraAngle ? `机位 ${storyboard.cameraAngle}` : "",
    storyboard.cameraMovement ? `运镜 ${storyboard.cameraMovement}` : "",
    storyboard.composition ? `构图 ${storyboard.composition}` : "",
    storyboard.lens ? `镜头焦段 ${storyboard.lens}` : "",
    storyboard.emotionTone ? `情绪 ${storyboard.emotionTone}` : "",
    storyboard.charactersInShot?.length
      ? `画面角色 ${storyboard.charactersInShot.join("、")}`
      : "",
    "cinematic storyboard frame, dramatic lighting, clear blocking, coherent character design",
  ]
    .filter(Boolean)
    .join("，");

const normalizeStoryboard = (
  raw: any,
  index: number,
  scenes: any[],
  characters: any[],
): StoryboardItem => {
  const sceneNumber = normalizeNumber(raw?.sceneNumber, index + 1);
  const matchedScene =
    scenes.find((scene) => scene.id && scene.id === raw?.sceneId) ||
    scenes[sceneNumber - 1] ||
    null;

  const mergedText = [
    sanitizeText(raw?.description),
    sanitizeText(raw?.imagePrompt),
  ]
    .filter(Boolean)
    .join(" ");

  const inferredCharacters = characters
    .map((character) => sanitizeText(character.name))
    .filter((name) => name && mergedText.includes(name));

  const shotType =
    sanitizeText(raw?.shotType || raw?.shotSize) || inferShotType(mergedText);

  const item: StoryboardItem = {
    id: raw?.id || `storyboard-${Date.now()}-${index}`,
    episodeId: raw?.episodeId,
    title: sanitizeText(raw?.title) || `镜头 ${index + 1}`,
    shotNumber: normalizeNumber(raw?.shotNumber, index + 1),
    sceneNumber,
    sceneId: raw?.sceneId || matchedScene?.id || "",
    sceneLabel:
      sanitizeText(
        raw?.sceneLabel || matchedScene?.name || matchedScene?.location,
      ) || `场景 ${sceneNumber}`,
    scriptId: raw?.scriptId || "",
    scriptTitle: raw?.scriptTitle || "",
    shotType,
    cameraAngle: sanitizeText(raw?.cameraAngle || raw?.angle),
    cameraMovement:
      sanitizeText(raw?.cameraMovement || raw?.movement) || "固定",
    durationSeconds: normalizeNumber(
      raw?.durationSeconds,
      inferDuration(shotType),
    ),
    composition: sanitizeText(raw?.composition),
    lens: sanitizeText(raw?.lens),
    emotionTone: sanitizeText(raw?.emotionTone || raw?.tone),
    charactersInShot: Array.isArray(raw?.charactersInShot)
      ? uniqueList(raw.charactersInShot.map(sanitizeText))
      : uniqueList(inferredCharacters),
    selectedCharacterAssetIds: Array.isArray(raw?.selectedCharacterAssetIds)
      ? uniqueList(raw.selectedCharacterAssetIds)
      : [],
    selectedSceneAssetIds: Array.isArray(raw?.selectedSceneAssetIds)
      ? uniqueList(raw.selectedSceneAssetIds)
      : [],
    imagePrompt: sanitizeText(raw?.imagePrompt),
    negativePrompt:
      sanitizeText(raw?.negativePrompt) || DEFAULT_NEGATIVE_PROMPT,
    imageUrl: sanitizeText(raw?.imageUrl),
    comfyAssetId: sanitizeText(raw?.comfyAssetId) || '',
    allImageUrls: Array.isArray(raw?.allImageUrls) ? raw.allImageUrls : [],
    allComfyAssetIds: Array.isArray(raw?.allComfyAssetIds) ? raw.allComfyAssetIds : [],
    generationStatus:
      raw?.generationStatus || (raw?.imageUrl ? "completed" : "idle"),
    generationTaskId: sanitizeText(raw?.generationTaskId),
    generationTaskType: sanitizeText(raw?.generationTaskType) || '',
    generatedAt: sanitizeText(raw?.generatedAt),
    source: raw?.source === "manual" ? "manual" : "ai",
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || new Date().toISOString(),
  };

  if (!item.imagePrompt) {
    item.imagePrompt = buildPromptFromStoryboard(item);
  }

  return item;
};

const normalizeList = (
  items: StoryboardItem[],
  scenes: any[],
  characters: any[],
) =>
  items.map((item, index) =>
    normalizeStoryboard(
      {
        ...item,
        shotNumber: index + 1,
        title: sanitizeText(item.title) || `镜头 ${index + 1}`,
      },
      index,
      scenes,
      characters,
    ),
  );

const createManualStoryboard = (index: number, scenes: any[]) =>
  normalizeStoryboard(
    {
      id: `storyboard-${Date.now()}-${index}`,
      title: `镜头 ${index + 1}`,
      shotNumber: index + 1,
      sceneNumber: 1,
      sceneId: scenes[0]?.id || "",
      sceneLabel:
        sanitizeText(scenes[0]?.name || scenes[0]?.location) || "未绑定场景",
      shotType: "中景",
      cameraAngle: "平视",
      cameraMovement: "固定",
      durationSeconds: 4,
      negativePrompt: DEFAULT_NEGATIVE_PROMPT,
      source: "manual",
    },
    index,
    scenes,
    [],
  );

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
};

const findStoryboardIndexById = (
  items: StoryboardItem[],
  storyboardId: string | null,
) => {
  if (!storyboardId) return -1;
  return items.findIndex((item) => item.id === storyboardId);
};

const extractTaskImages = (outputResult: any) => {
  // Prefer assets (OSS URLs) over images (ComfyUI IDs)
  if (Array.isArray(outputResult?.assets) && outputResult.assets.length > 0) {
    return outputResult.assets.filter(Boolean);
  }
  if (Array.isArray(outputResult?.images)) {
    return outputResult.images.filter(Boolean);
  }
  if (Array.isArray(outputResult)) {
    return outputResult.filter(Boolean);
  }
  return [];
};

function AssetSelector({
  title,
  description,
  options,
  selectedIds,
  onToggle,
  emptyText,
}: {
  title: string;
  description: string;
  options: AssetOption[];
  selectedIds: string[];
  onToggle: (assetId: string) => void;
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>

      {options.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((asset) => {
            const active = selectedIds.includes(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onToggle(asset.id)}
                className={`overflow-hidden rounded-lg border text-left transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <img
                  src={asset.url}
                  alt={asset.label}
                  className="h-20 w-full object-cover"
                />
                <div className="space-y-1 p-2">
                  <div className="line-clamp-1 text-sm font-medium">
                    {asset.sourceName}
                  </div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {asset.label}
                  </div>
                  {asset.meta ? (
                    <div className="text-[11px] text-muted-foreground">
                      {asset.meta}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed py-6 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}
    </div>
  );
}

export function StoryboardStep() {
  const {
    projectId,
    project,
    error,
    setError,
    clearError,
    steps,
    updateStepStatus,
    scripts,
    selectedScriptIndex,
    storyboardsResult,
    setStoryboardsResult,
    saveStoryboardsToBackend,
    charactersResult,
    scenesResult,
  } = useCreateWorkflowStore((state) => ({
    projectId: state.projectId,
    project: state.project,
    error: state.error,
    setError: state.setError,
    clearError: state.clearError,
    steps: state.steps,
    updateStepStatus: state.updateStepStatus,
    scripts: state.scripts,
    selectedScriptIndex: state.selectedScriptIndex,
    storyboardsResult: state.storyboardsResult,
    setStoryboardsResult: state.setStoryboardsResult,
    saveStoryboardsToBackend: state.saveStoryboardsToBackend,
    charactersResult: state.charactersResult,
    scenesResult: state.scenesResult,
  }));

  const step = steps.find((item) => item.id === "storyboard");

  const storyboards = useMemo(
    () =>
      (storyboardsResult || []).map((item, index) =>
        normalizeStoryboard(item, index, scenesResult, charactersResult),
      ),
    [charactersResult, scenesResult, storyboardsResult],
  );

  const characterAssetOptions = useMemo<AssetOption[]>(() => {
    return charactersResult.flatMap((character, characterIndex) => {
      const sourceName =
        sanitizeText(character.name) || `角色 ${characterIndex + 1}`;

      const imageUrls = Array.isArray(character.imageUrls)
        ? character.imageUrls
            .filter(Boolean)
            .map((url: string, imageIndex: number) => ({
              id: `character-image:${character.id || characterIndex}:${imageIndex}`,
              url,
              label: `${sourceName} 形象 ${imageIndex + 1}`,
              sourceName,
              meta: "角色主图",
            }))
        : [];

      const assets = Array.isArray(character.assets)
        ? character.assets
            .filter((asset: any) => asset?.url)
            .map((asset: any, assetIndex: number) => ({
              id:
                asset.id ||
                `character-asset:${character.id || characterIndex}:${assetIndex}`,
              url: asset.url,
              label:
                sanitizeText(asset.prompt) ||
                `${sourceName} 资产 ${assetIndex + 1}`,
              sourceName,
              meta: [sanitizeText(asset.shotSize), sanitizeText(asset.angle)]
                .filter(Boolean)
                .join(" / "),
            }))
        : [];

      return [...imageUrls, ...assets];
    });
  }, [charactersResult]);

  const sceneAssetOptions = useMemo<AssetOption[]>(() => {
    return scenesResult.flatMap((scene, sceneIndex) => {
      const sourceName =
        sanitizeText(scene.name || scene.location) || `场景 ${sceneIndex + 1}`;

      const cover = scene.imageUrl
        ? [
            {
              id: `scene-cover:${scene.id || sceneIndex}`,
              url: scene.imageUrl,
              label: `${sourceName} 设定图`,
              sourceName,
              meta: sanitizeText(scene.timeOfDay),
            },
          ]
        : [];

      const assets = Array.isArray(scene.assets)
        ? scene.assets
            .filter((asset: any) => asset?.url)
            .map((asset: any, assetIndex: number) => ({
              id:
                asset.id ||
                `scene-asset:${scene.id || sceneIndex}:${assetIndex}`,
              url: asset.url,
              label:
                sanitizeText(asset.prompt) ||
                `${sourceName} 资产 ${assetIndex + 1}`,
              sourceName,
              meta: [sanitizeText(asset.shotSize), sanitizeText(asset.angle)]
                .filter(Boolean)
                .join(" / "),
            }))
        : [];

      return [...cover, ...assets];
    });
  }, [scenesResult]);

  const [selectedStoryboardId, setSelectedStoryboardId] = useState<
    string | null
  >(null);
  const [draftStoryboard, setDraftStoryboard] = useState<StoryboardItem | null>(
    null,
  );
  const [scriptPickerOpen, setScriptPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [storyboardPreviewImage, setStoryboardPreviewImage] = useState<string | null>(null);
  const [selectedScriptForGeneration, setSelectedScriptForGeneration] =
    useState(0);
  const [generatingFromScript, setGeneratingFromScript] = useState(false);
  const [generatedCandidates, setGeneratedCandidates] = useState<
    StoryboardItem[]
  >([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    [],
  );
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generatingImageForId, setGeneratingImageForId] = useState<
    string | null
  >(null);

  // @ mention for character and scene assets in image prompt
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionDropdownIndex, setMentionDropdownIndex] = useState(-1);
  // Track selected assets by @ mention: { displayText: "@名称", imageUrl: "...", comfyAssetId: "...", type: "character" | "scene" }
  const [mentionAssets, setMentionAssets] = useState<{ displayText: string; imageUrl: string; comfyAssetId: string; type: string }[]>([]);

  // Get all character and scene assets for @ mention dropdown
  const mentionOptions = useMemo(() => {
    const options: { id: string; name: string; imageUrl: string; comfyAssetId: string; type: string }[] = [];

    // Add character assets
    charactersResult.forEach((char: any, charIndex: number) => {
      if (char.assets && char.assets.length > 0) {
        char.assets.forEach((asset: any, assetIndex: number) => {
          if (asset.url && asset.url !== '/placeholder.png') {
            console.log('[mentionOptions] char asset:', char.name, 'asset.comfyAssetId:', asset.comfyAssetId, 'asset:', asset);
            options.push({
              id: `char-${charIndex}-${assetIndex}`,
              name: char.name || `角色${charIndex + 1}`,
              imageUrl: asset.url,
              comfyAssetId: asset.comfyAssetId || '',
              type: 'character',
            });
          }
        });
      }
    });

    // Add scene assets
    scenesResult.forEach((scene: any, sceneIndex: number) => {
      if (scene.assets && scene.assets.length > 0) {
        scene.assets.forEach((asset: any, assetIndex: number) => {
          if (asset.url && asset.url !== '/placeholder.png') {
            console.log('[mentionOptions] scene asset:', scene.name, 'asset.comfyAssetId:', asset.comfyAssetId, 'asset:', asset);
            options.push({
              id: `scene-${sceneIndex}-${assetIndex}`,
              name: scene.name || `场景${sceneIndex + 1}`,
              imageUrl: asset.url,
              comfyAssetId: asset.comfyAssetId || '',
              type: 'scene',
            });
          }
        });
      }
    });

    console.log('[mentionOptions] total options:', options.length, 'with comfyAssetId:', options.filter(o => o.comfyAssetId).length);
    return options;
  }, [charactersResult, scenesResult]);

  const handleImagePromptChange = (value: string) => {
    // Check if user typed @ to show mention dropdown
    const lastAtIndex = value.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's text after @ (filtering)
      const textAfterAt = value.slice(lastAtIndex + 1);
      if (textAfterAt.includes(' ')) {
        // If there's a space after @, close dropdown and treat @ as regular text
        setShowMentionDropdown(false);
      } else {
        // Show dropdown for @ mention
        setShowMentionDropdown(true);
        setMentionDropdownIndex(0);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const handleSelectMention = (option: typeof mentionOptions[0]) => {
    console.log('[handleSelectMention] option:', option.name, 'type:', option.type, 'comfyAssetId:', option.comfyAssetId);
    // Find the @ that was just typed (the last unclosed @)
    // Use draftStoryboard directly to avoid stale state issues
    const currentPrompt = draftStoryboard?.imagePrompt || '';
    const lastAtIndex = currentPrompt.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      // Check that there's no space between @ and cursor
      const textAfterAt = currentPrompt.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ')) {
        const before = currentPrompt.slice(0, lastAtIndex);
        const typePrefix = option.type === 'scene' ? '[场景]' : '';
        const newPrompt = before + '@' + typePrefix + option.name + ' ';
        updateDraft({ imagePrompt: newPrompt });
        // Store the mention with image URL and comfyAssetId (use same typePrefix for displayText)
        const displayText = `@${typePrefix}${option.name}`;
        console.log('[handleSelectMention] adding to mentionAssets, displayText:', displayText, 'comfyAssetId:', option.comfyAssetId);
        setMentionAssets(prev => [...prev, { displayText, imageUrl: option.imageUrl, comfyAssetId: option.comfyAssetId, type: option.type }]);
      }
    }
    setShowMentionDropdown(false);
  };

  const handleMentionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentionDropdown || mentionOptions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionDropdownIndex(prev => Math.min(prev + 1, mentionOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionDropdownIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && mentionDropdownIndex >= 0) {
      e.preventDefault();
      handleSelectMention(mentionOptions[mentionDropdownIndex]);
    } else if (e.key === 'Escape') {
      setShowMentionDropdown(false);
    }
  };

  useEffect(() => {
    if (storyboards.length === 0) {
      setSelectedStoryboardId(null);
      updateStepStatus("storyboard", "pending");
      return;
    }

    if (findStoryboardIndexById(storyboards, selectedStoryboardId) === -1) {
      setSelectedStoryboardId(storyboards[0]?.id || null);
    }

    updateStepStatus("storyboard", "completed");
  }, [selectedStoryboardId, storyboards, updateStepStatus]);

  const selectedStoryboardIndex = useMemo(
    () => findStoryboardIndexById(storyboards, selectedStoryboardId),
    [selectedStoryboardId, storyboards],
  );

  const selectedStoryboard =
    selectedStoryboardIndex >= 0
      ? storyboards[selectedStoryboardIndex] || null
      : null;

  useEffect(() => {
    setDraftStoryboard(selectedStoryboard ? { ...selectedStoryboard } : null);
    setHasUnsavedChanges(false);
    setShowMentionDropdown(false);
    setMentionAssets([]);
  }, [selectedStoryboard?.id, selectedStoryboard?.updatedAt]);

  const activeStoryboard = draftStoryboard ?? selectedStoryboard;

  const selectedCharacterAssets = useMemo(
    () =>
      activeStoryboard
        ? characterAssetOptions.filter((asset) =>
            activeStoryboard.selectedCharacterAssetIds.includes(asset.id),
          )
        : [],
    [activeStoryboard, characterAssetOptions],
  );

  const selectedSceneAssets = useMemo(
    () =>
      activeStoryboard
        ? sceneAssetOptions.filter((asset) =>
            activeStoryboard.selectedSceneAssetIds.includes(asset.id),
          )
        : [],
    [activeStoryboard, sceneAssetOptions],
  );

  const mergeDraftIntoItems = (items: StoryboardItem[]) => {
    if (!draftStoryboard) {
      return items;
    }

    return items.map((item, index) =>
      item.id === draftStoryboard.id
        ? normalizeStoryboard(
            {
              ...item,
              ...draftStoryboard,
              updatedAt: new Date().toISOString(),
            },
            index,
            scenesResult,
            charactersResult,
          )
        : item,
    );
  };

  const persistStoryboards = async (
    items: StoryboardItem[],
    updateStore = true,
    nextSelectedId?: string | null,
  ) => {
    const normalizedItems = normalizeList(
      items,
      scenesResult,
      charactersResult,
    );

    if (updateStore) {
      setStoryboardsResult(normalizedItems);
    }

    setIsSaving(true);
    clearError();
    try {
      await saveStoryboardsToBackend(normalizedItems);
      setHasUnsavedChanges(false);
      const activeId =
        nextSelectedId === undefined
          ? draftStoryboard?.id || selectedStoryboardId || null
          : nextSelectedId;
      if (activeId) {
        const matchedItem = normalizedItems.find(
          (item) => item.id === activeId,
        );
        if (matchedItem) {
          setSelectedStoryboardId(matchedItem.id);
          setDraftStoryboard({ ...matchedItem });
        }
      }
      return normalizedItems;
    } finally {
      setIsSaving(false);
    }
  };

  const applyStoryboards = (
    items: StoryboardItem[],
    nextSelectedId?: string | null,
  ) => {
    const normalizedItems = normalizeList(
      items,
      scenesResult,
      charactersResult,
    );
    setStoryboardsResult(normalizedItems);

    if (normalizedItems.length === 0) {
      setSelectedStoryboardId(null);
      return normalizedItems;
    }

    const activeId =
      nextSelectedId === undefined
        ? draftStoryboard?.id || selectedStoryboardId || normalizedItems[0]?.id
        : nextSelectedId;
    const matchedId =
      normalizedItems.find((item) => item.id === activeId)?.id ||
      normalizedItems[0]?.id ||
      null;
    setSelectedStoryboardId(matchedId);
    return normalizedItems;
  };

  const updateDraft = (
    patch:
      | Partial<StoryboardItem>
      | ((item: StoryboardItem) => Partial<StoryboardItem> | StoryboardItem),
  ) => {
    setDraftStoryboard((current) => {
      if (!current) return current;
      const nextPatch = typeof patch === "function" ? patch(current) : patch;
      setHasUnsavedChanges(true);
      return {
        ...current,
        ...nextPatch,
      };
    });
  };

  const handleSaveCurrentEdits = async () => {
    if (!draftStoryboard) return;
    const nextItems = mergeDraftIntoItems(storyboards);
    const normalizedItems = applyStoryboards(nextItems, draftStoryboard.id);
    await persistStoryboards(normalizedItems, false, draftStoryboard.id);
  };

  const handleSelectStoryboard = (storyboardId: string) => {
    if (storyboardId === selectedStoryboardId) return;
    if (
      hasUnsavedChanges &&
      !window.confirm("当前分镜有未保存修改，切换后将丢失，确定继续吗？")
    ) {
      return;
    }
    setSelectedStoryboardId(storyboardId);
  };

  const handleMoveSelectedStoryboard = async (direction: "up" | "down") => {
    if (!selectedStoryboardId || storyboards.length <= 1) return;

    const baseItems = mergeDraftIntoItems(storyboards);
    const fromIndex = findStoryboardIndexById(baseItems, selectedStoryboardId);
    if (fromIndex === -1) return;

    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= storyboards.length) return;

    const nextItems = moveItem(baseItems, fromIndex, toIndex);
    const normalizedItems = applyStoryboards(nextItems, selectedStoryboardId);
    await persistStoryboards(normalizedItems, false, selectedStoryboardId);
  };

  const handleAddStoryboard = async () => {
    const baseItems = mergeDraftIntoItems(storyboards);
    const newItem = createManualStoryboard(baseItems.length, scenesResult);
    const nextItems = [...baseItems, newItem];
    const normalizedItems = applyStoryboards(nextItems, newItem.id);
    await persistStoryboards(normalizedItems, false, newItem.id);
  };

  const handleDuplicateStoryboard = async (storyboardId: string) => {
    const baseItems = mergeDraftIntoItems(storyboards);
    const index = findStoryboardIndexById(baseItems, storyboardId);
    if (index === -1) return;
    const source = baseItems[index];
    if (!source) return;

    const nextItems = [...baseItems];
    nextItems.splice(
      index + 1,
      0,
      normalizeStoryboard(
        {
          ...source,
          id: `storyboard-${Date.now()}-${index}`,
          title: `${source.title} 副本`,
          source: "manual",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        index + 1,
        scenesResult,
        charactersResult,
      ),
    );

    const normalizedItems = applyStoryboards(
      nextItems,
      nextItems[index + 1]?.id || null,
    );
    await persistStoryboards(
      normalizedItems,
      false,
      nextItems[index + 1]?.id || null,
    );
  };

  const handleDeleteStoryboard = async (storyboardId: string) => {
    const baseItems = mergeDraftIntoItems(storyboards);
    const index = findStoryboardIndexById(baseItems, storyboardId);
    if (index === -1) return;
    const target = baseItems[index];
    if (!target) return;
    if (!window.confirm(`确定删除 ${target.title} 吗？`)) return;

    // 先从数据库删除（如果有真实 id）
    if (target.id && !target.id.startsWith('storyboard-')) {
      try {
        const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
        await fetch(`${API_URL}/api/storyboards/${target.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('删除分镜失败:', e);
      }
    }

    const nextItems = baseItems.filter((_, itemIndex) => itemIndex !== index);
    const nextSelectedId =
      nextItems.length === 0
        ? null
        : nextItems[Math.min(index, nextItems.length - 1)]?.id || null;
    const normalizedItems = applyStoryboards(nextItems, nextSelectedId);
    await persistStoryboards(normalizedItems, false, nextSelectedId);
  };

  const toggleCharacterInShot = (characterName: string) => {
    updateDraft((item) => ({
      charactersInShot: item.charactersInShot.includes(characterName)
        ? item.charactersInShot.filter((name) => name !== characterName)
        : [...item.charactersInShot, characterName],
    }));
  };

  const toggleAssetSelection = (
    kind: "character" | "scene",
    assetId: string,
  ) => {
    updateDraft((item) => {
      const key =
        kind === "character"
          ? "selectedCharacterAssetIds"
          : "selectedSceneAssetIds";
      const currentIds = item[key];
      const nextIds = currentIds.includes(assetId)
        ? currentIds.filter((id) => id !== assetId)
        : [...currentIds, assetId];

      return { [key]: nextIds } as Partial<StoryboardItem>;
    });
  };

  const rebuildPrompt = () => {
    if (!activeStoryboard) return;
    updateDraft({
      imagePrompt: buildPromptFromStoryboard(activeStoryboard),
    });
  };

  const openScriptPicker = () => {
    if (scripts.length === 0) {
      setError("请先在剧本步骤准备至少一版剧本。");
      return;
    }
    clearError();
    setSelectedScriptForGeneration(selectedScriptIndex ?? 0);
    setScriptPickerOpen(true);
  };

  const generateStoryboardsFromScript = async () => {
    if (!projectId) return;
    const token = getToken();
    if (!token) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    const script = scripts[selectedScriptForGeneration];
    const scriptContent = getScriptContent(script);

    if (!scriptContent) {
      setError("所选剧本没有内容，无法生成分镜。");
      return;
    }

    setGeneratingFromScript(true);
    updateStepStatus("storyboard", "generating");
    clearError();
    setGeneratedCandidates([]);
    setSelectedCandidateIds([]);
    setPreviewOpen(true);

    try {
      // 解析剧本内容，按场景分割
      const scenes = parseScriptToScenes(scriptContent);

      if (scenes.length === 0) {
        throw new Error("无法从剧本中提取场景，请确保剧本格式正确。");
      }

      setGenerationProgress({ current: 0, total: scenes.length });

      // 并发生成分镜（保持顺序）
      const fetchSceneStoryboards = async (scene: { name: string; content: string }, i: number) => {
        try {
          const response = await fetch(
            `${API_URL}/api/workflow/projects/${projectId}/storyboards/scene`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                scriptContent,
                sceneIndex: i,
                sceneName: scene.name,
                sceneContent: scene.content,
              }),
            },
          );

          if (!response.ok) {
            throw new Error(`场景 ${i + 1} 生成分镜失败`);
          }

          const generated = await response.json();
          // 找到匹配的场景
          const matchedScene = scenesResult.find(s => s.name === scene.name) || scenesResult[i] || scenesResult[0];
          const candidates = (Array.isArray(generated) ? generated : []).map(
            (item: any, index: number) =>
              normalizeStoryboard(
                {
                  ...item,
                  id: `candidate-${Date.now()}-${i}-${index}`,
                  source: "ai",
                  scriptId: script.id || "",
                  scriptTitle: sanitizeText(script.title) || `剧本 ${selectedScriptForGeneration + 1}`,
                  sceneId: matchedScene?.id || "",
                  sceneLabel: matchedScene?.name || matchedScene?.location || scene.name,
                },
                i * 100 + index,
                scenesResult,
                charactersResult,
              ),
          );

          return { index: i, candidates };
        } catch (sceneError: any) {
          console.error(`Scene ${i + 1} generation failed:`, sceneError);
          return { index: i, candidates: [], error: sceneError.message };
        }
      };

      // 并发所有请求，实时更新UI
      const allCandidates: StoryboardItem[] = [];
      let completedCount = 0;

      // 初始化显示区域
      setGeneratedCandidates([]);
      setSelectedCandidateIds([]);

      // 并发请求，每个完成后立即更新UI
      await Promise.all(
        scenes.map((scene, i) =>
          fetchSceneStoryboards(scene, i).then((result) => {
            completedCount++;
            // 将结果按顺序插入（按index排序后追加）
            const insertIndex = allCandidates.length;
            allCandidates.push(...result.candidates);
            // 按index排序确保顺序正确
            allCandidates.sort((a, b) => a.shotNumber - b.shotNumber);
            // 更新UI
            setGeneratedCandidates([...allCandidates]);
            setSelectedCandidateIds(allCandidates.map((item) => item.id));
            setGenerationProgress({ current: completedCount, total: scenes.length });
          }).catch((err) => {
            completedCount++;
            setGenerationProgress({ current: completedCount, total: scenes.length });
            console.error(`Scene ${i + 1} failed:`, err);
          })
        ),
      );

      updateStepStatus(
        "storyboard",
        storyboards.length > 0 ? "completed" : "pending",
      );
    } catch (submitError: any) {
      setError(submitError.message || "分镜生成失败，请稍后重试。");
      updateStepStatus(
        "storyboard",
        storyboards.length > 0 ? "completed" : "pending",
      );
    } finally {
      setGeneratingFromScript(false);
    }
  };

  const insertSelectedCandidates = async () => {
    const picked = generatedCandidates.filter((item) =>
      selectedCandidateIds.includes(item.id),
    );
    if (picked.length === 0) {
      setError("请至少选择一个分镜再插入。");
      return;
    }

    const baseItems = mergeDraftIntoItems(storyboards);
    const selectedIndex = findStoryboardIndexById(
      baseItems,
      selectedStoryboardId,
    );
    const insertIndex =
      selectedIndex >= 0 ? selectedIndex + 1 : baseItems.length;
    const nextItems = [...baseItems];

    nextItems.splice(
      insertIndex,
      0,
      ...picked.map((item, index) =>
        normalizeStoryboard(
          {
            ...item,
            id: `storyboard-${Date.now()}-${index}`,
            generationTaskId: "",
            generationTaskType: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            // 保留脚本绑定信息
            scriptId: item.scriptId,
            scriptTitle: item.scriptTitle,
          },
          insertIndex + index,
          scenesResult,
          charactersResult,
        ),
      ),
    );

    const normalizedItems = applyStoryboards(
      nextItems,
      nextItems[insertIndex]?.id || null,
    );
    await persistStoryboards(
      normalizedItems,
      false,
      nextItems[insertIndex]?.id || null,
    );
    setPreviewOpen(false);
    setGeneratedCandidates([]);
    setSelectedCandidateIds([]);
  };

  const waitForTaskCompletion = async (taskId: string, token: string, taskType?: string) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const url = taskType
        ? `${API_URL}/api/generation/tasks/${taskId}?taskType=${encodeURIComponent(taskType)}`
        : `${API_URL}/api/generation/tasks/${taskId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("读取生图任务状态失败。");
      }

      const data = await response.json();
      if (data.status === "completed") return data;
      if (data.status === "failed") {
        throw new Error(data.error || "分镜图生成失败。");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("分镜图生成超时，请稍后重试。");
  };

  const handleGenerateImage = async () => {
    if (!activeStoryboard || !projectId) {
      return;
    }

    const token = getToken();
    if (!token) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    const activeStoryboardId = activeStoryboard.id;
    const activeIndex = findStoryboardIndexById(
      storyboards,
      activeStoryboardId,
    );
    if (activeIndex === -1) return;

    clearError();
    setGeneratingImageForId(activeStoryboard.id);

    const prompt =
      sanitizeText(activeStoryboard.imagePrompt) ||
      buildPromptFromStoryboard(activeStoryboard);
    const negativePrompt =
      sanitizeText(activeStoryboard.negativePrompt) || DEFAULT_NEGATIVE_PROMPT;
    const references = uniqueList(
      [
        ...selectedSceneAssets.map((asset) => asset.url),
        ...selectedCharacterAssets.map((asset) => asset.url),
        ...mentionAssets.map((m) => m.imageUrl),
      ].filter(Boolean),
    ).slice(0, 3);

    // 检查是否有 @ 引用且都有 comfyAssetId，如果有则用智能分镜
    // mentionAssets 存储时已经有 comfyAssetId，直接使用
    let mentionWithAssetIds = mentionAssets.filter(m => m.comfyAssetId);

    // 如果 mentionAssets 为空但 prompt 中有 @ 提及，尝试从 mentionOptions 匹配
    if (mentionWithAssetIds.length === 0 && prompt.includes('@')) {
      const mentionedNames: string[] = [];
      const atMatches = prompt.match(/@(\[场景\])?([^@\s]+)/g) || [];
      for (const match of atMatches) {
        const name = match.replace('@[场景]', '').replace('@', '').trim();
        if (name) mentionedNames.push(name);
      }

      // 从 mentionOptions 中查找匹配的资产
      for (const name of mentionedNames) {
        const option = mentionOptions.find(opt =>
          opt.name === name ||
          (opt.type === 'scene' && `[场景]${opt.name}` === name)
        );
        if (option?.comfyAssetId) {
          mentionWithAssetIds.push({
            displayText: option.type === 'scene' ? `@[场景]${name}` : `@${name}`,
            imageUrl: option.imageUrl,
            comfyAssetId: option.comfyAssetId,
            type: option.type,
          });
        }
      }
    }

    const hasSmartStoryboard = mentionWithAssetIds.length > 0;
    console.log('[生图调试] hasSmartStoryboard:', hasSmartStoryboard, 'mentionWithAssetIds:', mentionWithAssetIds, 'mentionAssets:', mentionAssets);

    const taskType = "分镜图生成";
    let finalPrompt = prompt;

    // 如果是智能分镜，替换 prompt 中的 @资产名 为 图1, 图2 等
    if (hasSmartStoryboard) {
      const assetIds = mentionWithAssetIds.map(m => m.comfyAssetId);
      mentionWithAssetIds.forEach((m, index) => {
        const regex = new RegExp(m.displayText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        finalPrompt = finalPrompt.replace(regex, `图${index + 1}`);
        // 同时替换 ImageId-1, ImageId-2 等占位符
        finalPrompt = finalPrompt.replace(new RegExp(`ImageId-${index + 1}`, 'g'), assetIds[index] || '');
      });
    }

    const workingItem = normalizeStoryboard(
      {
        ...activeStoryboard,
        imagePrompt: prompt,
        negativePrompt,
        imageUrl: '/placeholder.png', // placeholder for loading state
        generationStatus: "queued",
        generationTaskType: taskType,
        updatedAt: new Date().toISOString(),
      },
      activeIndex,
      scenesResult,
      charactersResult,
    );

    const queuedItems = storyboards.map((item) =>
      item.id === activeStoryboardId ? workingItem : item,
    );
    applyStoryboards(queuedItems, activeStoryboardId);
    setDraftStoryboard({ ...workingItem });
    setHasUnsavedChanges(false);

    try {
      let queueResponse;
      if (hasSmartStoryboard) {
        // 智能分镜：使用资产引用，调用 smart-storyboard 接口
        const assetIds = mentionWithAssetIds.map(m => m.comfyAssetId);
        queueResponse = await fetch(`${API_URL}/api/generation/smart-storyboard`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            taskType: "分镜图生成",
            prompt: finalPrompt,
            assetIds,
            episodeId: activeStoryboard.episodeId,
            storyboardId: activeStoryboard.id,
          }),
        });
      } else {
        // 普通生成：调 workflow 接口
        queueResponse = await fetch(`${API_URL}/api/generation/workflow`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            taskType: "分镜图生成",
            step: "storyboard",
            prompt: finalPrompt,
            referenceAssetIds: references,
            inParam: JSON.stringify({ negative_prompt: negativePrompt }),
            episodeId: activeStoryboard.episodeId,
            storyboardId: activeStoryboard.id,
          }),
        });
      }

      if (!queueResponse.ok) {
        throw new Error("提交分镜图任务失败。");
      }

      const queuedTask = await queueResponse.json();
      const generatingItem = normalizeStoryboard(
        {
          ...workingItem,
          generationStatus: "generating",
          generationTaskId: queuedTask.taskId || "",
          generationTaskType: taskType,
        },
        activeIndex,
        scenesResult,
        charactersResult,
      );
      const generatingItems = queuedItems.map((item) =>
        item.id === activeStoryboardId ? generatingItem : item,
      );
      applyStoryboards(generatingItems, activeStoryboardId);
      setDraftStoryboard({ ...generatingItem });

      const completedTask = await waitForTaskCompletion(
        queuedTask.taskId,
        token,
        taskType,
      );
      const images = extractTaskImages(completedTask.outputs);
      if (images.length === 0) {
        throw new Error("任务已完成，但没有返回可用图片。");
      }
      const comfyAssetIds = (completedTask.outputs as any)?.comfyAssetIds || [];

      const completedItem = normalizeStoryboard(
        {
          ...generatingItem,
          imageUrl: images[0],
          comfyAssetId: comfyAssetIds[0] || '',
          allImageUrls: images,
          allComfyAssetIds: comfyAssetIds,
          generationStatus: "completed",
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeIndex,
        scenesResult,
        charactersResult,
      );
      console.log('[保存分镜] completedItem.imageUrl:', completedItem.imageUrl, 'comfyAssetId:', completedItem.comfyAssetId);
      const completedItems = generatingItems.map((item) =>
        item.id === activeStoryboardId ? completedItem : item,
      );
      const normalizedItems = applyStoryboards(
        completedItems,
        activeStoryboardId,
      );
      await persistStoryboards(normalizedItems, false, completedItem.id);
    } catch (submitError: any) {
      const failedItem = normalizeStoryboard(
        {
          ...workingItem,
          generationStatus: "failed",
        },
        activeIndex,
        scenesResult,
        charactersResult,
      );
      const failedItems = storyboards.map((item) =>
        item.id === activeStoryboardId ? failedItem : item,
      );
      applyStoryboards(failedItems, activeStoryboardId);
      setDraftStoryboard({ ...failedItem });
      setError(submitError.message || "分镜图生成失败。");
    } finally {
      setGeneratingImageForId(null);
    }
  };

  const saveStatusText =
    step?.status === "generating"
      ? "正在生成分镜候选"
      : isSaving
        ? "正在保存"
        : hasUnsavedChanges
          ? "当前分镜有未保存修改"
          : storyboards.length > 0
            ? "已同步到分镜列表"
            : "还没有分镜";

  return (
    <div className="flex flex-col flex-1 min-h-0">

      <ErrorBanner error={error} />

      {scripts.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1 overflow-x-auto">
          {scripts.map((script: any, index: number) => (
            <button
              key={script.id || index}
              type="button"
              onClick={() => setSelectedScriptForGeneration(index)}
              className={`shrink-0 rounded-lg border px-4 py-1.5 text-sm transition-colors ${
                selectedScriptForGeneration === index
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              }`}
            >
              {sanitizeText(script.title) || `剧本 ${index + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-1 gap-3 min-h-0">
        <div className="flex w-[420px] flex-shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-[0_4px_20px_hsl(217.2_60%_45%_/_0.1),_0_2px_8px_hsl(0_0%_0%_/_0.4)]">
          <div className="flex items-center justify-between neon-border-bottom neon-header p-3">
            <div className="text-sm font-medium">分镜列表</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void generateStoryboardsFromScript()}
                disabled={generatingFromScript || scripts.length === 0}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                {generatingFromScript ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    AI生成
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleAddStoryboard()}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
              >
                <Plus size={14} />
                手工补镜
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-2.5">
            {storyboards.length > 0 ? (
              storyboards.map((item, index) => {
                const isActive = selectedStoryboardId === item.id;
                const isGenerating = generatingImageForId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-2 transition-colors ${
                      isActive
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-stretch gap-2">
                      <button
                        type="button"
                        draggable={false}
                        onClick={() => handleSelectStoryboard(item.id)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleMoveSelectedStoryboard("up");
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleMoveSelectedStoryboard("down");
                          }
                        }}
                        className="flex min-w-0 flex-1 select-none items-start gap-2 rounded-md text-left outline-none"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-medium text-primary">
                            镜头 {item.shotNumber.toString().padStart(2, "0")}
                          </div>
                          <div className="truncate text-sm font-medium leading-5">
                            {item.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {item.sceneLabel} · {item.shotType}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{item.durationSeconds}s</span>
                            <span>
                              {item.generationStatus === "completed"
                                ? "已生成图"
                                : item.generationStatus === "failed"
                                  ? "生成失败"
                                  : item.generationStatus === "generating"
                                    ? "生成中"
                                    : item.generationStatus === "queued"
                                      ? "排队中"
                                      : item.source === "manual"
                                        ? "手工添加"
                                        : "AI 生成"}
                            </span>
                          </div>
                        </div>

                        <div className="w-24 flex-shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              draggable={false}
                              className="h-[72px] w-24 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-[72px] w-24 items-center justify-center rounded-md bg-muted/50 px-2 text-center text-[11px] text-muted-foreground">
                              {isGenerating ? "生成中..." : "未生成图"}
                            </div>
                          )}
                        </div>
                      </button>

                      <div className="flex flex-shrink-0 flex-col items-end justify-center gap-2">
                        <button
                          type="button"
                          draggable={false}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDuplicateStoryboard(item.id);
                          }}
                          className="inline-flex h-[14px] w-[14px] items-center justify-center p-0 text-muted-foreground hover:text-foreground"
                        >
                          <CopyPlus size={14} />
                        </button>
                        <button
                          type="button"
                          draggable={false}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDeleteStoryboard(item.id);
                          }}
                          className="inline-flex h-[14px] w-[14px] items-center justify-center p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
                <div className="text-center">
                  <Clapperboard size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    先从剧本生成，或手工新增第一条分镜。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-[0_4px_20px_hsl(217.2_60%_45%_/_0.1),_0_2px_8px_hsl(0_0%_0%_/_0.4)] min-h-0">
          {activeStoryboard ? (
            <>
              <div className="flex items-center justify-between neon-border-bottom neon-header p-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-primary">
                    分场 {activeStoryboard.sceneNumber} · 镜头{" "}
                    {activeStoryboard.shotNumber}
                  </div>
                  <div className="truncate text-base font-semibold">
                    {activeStoryboard.title}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rebuildPrompt}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    <RefreshCw size={14} />
                    重建提示词
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGenerateImage()}
                    disabled={generatingImageForId === activeStoryboard.id}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {generatingImageForId === activeStoryboard.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        生成中
                      </>
                    ) : (
                      <>
                        <ImagePlus size={16} />
                        生成分镜图
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-1 gap-3 min-h-0">
                <div className="w-[420px] shrink-0 overflow-auto space-y-3 py-3 pl-3">
                  <section className="rounded-xl border p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">镜头基础</div>
                      <button
                        type="button"
                        onClick={() => void handleSaveCurrentEdits()}
                        disabled={isSaving || !hasUnsavedChanges}
                        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            保存中
                          </>
                        ) : (
                          <>
                            <Save size={14} />
                            保存
                          </>
                        )}
                      </button>
                    </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            镜头标题
                          </span>
                          <input
                            value={activeStoryboard.title}
                            onChange={(event) =>
                              updateDraft({ title: event.target.value })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            分场编号
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={activeStoryboard.sceneNumber}
                            onChange={(event) =>
                              updateDraft({
                                sceneNumber: normalizeNumber(
                                  event.target.value,
                                  1,
                                ),
                              })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            镜头时长（秒）
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={activeStoryboard.durationSeconds}
                            onChange={(event) =>
                              updateDraft({
                                durationSeconds: normalizeNumber(
                                  event.target.value,
                                  1,
                                ),
                              })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            绑定场景
                          </span>
                          <select
                            value={activeStoryboard.sceneId}
                            onChange={(event) => {
                              const scene = scenesResult.find(
                                (item) => item.id === event.target.value,
                              );
                              updateDraft({
                                sceneId: scene?.id || "",
                                sceneLabel:
                                  sanitizeText(
                                    scene?.name || scene?.location,
                                  ) || activeStoryboard.sceneLabel,
                                sceneNumber: scene
                                  ? scenesResult.findIndex(
                                      (item) => item.id === scene.id,
                                    ) + 1
                                  : activeStoryboard.sceneNumber,
                              });
                            }}
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">未绑定</option>
                            {scenesResult.map((scene, index) => (
                              <option
                                key={scene.id || index}
                                value={scene.id || ""}
                              >
                                {sanitizeText(scene.name || scene.location) ||
                                  `场景 ${index + 1}`}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">景别</span>
                          <select
                            value={activeStoryboard.shotType}
                            onChange={(event) =>
                              updateDraft({ shotType: event.target.value })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {SHOT_TYPES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">机位</span>
                          <select
                            value={activeStoryboard.cameraAngle}
                            onChange={(event) =>
                              updateDraft({ cameraAngle: event.target.value })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">未指定</option>
                            {CAMERA_ANGLES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">运镜</span>
                          <select
                            value={activeStoryboard.cameraMovement}
                            onChange={(event) =>
                              updateDraft({
                                cameraMovement: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {CAMERA_MOVEMENTS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            情绪氛围
                          </span>
                          <select
                            value={activeStoryboard.emotionTone}
                            onChange={(event) =>
                              updateDraft({ emotionTone: event.target.value })
                            }
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="">未指定</option>
                            {EMOTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">构图</span>
                          <input
                            value={activeStoryboard.composition}
                            onChange={(event) =>
                              updateDraft({ composition: event.target.value })
                            }
                            placeholder="前景遮挡、对角线构图..."
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            镜头焦段
                          </span>
                          <input
                            value={activeStoryboard.lens}
                            onChange={(event) =>
                              updateDraft({ lens: event.target.value })
                            }
                            placeholder="35mm / 50mm / 长焦"
                            className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                      </div>
                    </section>

                    <section className="rounded-xl border p-3">
                      <div className="mb-3 text-sm font-medium">角色与资产</div>
                      <div className="space-y-4">
                        <div>
                          <div className="mb-2 text-xs text-muted-foreground">
                            出镜角色
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {charactersResult.length > 0 ? (
                              charactersResult.map((character, index) => {
                                const name =
                                  sanitizeText(character.name) ||
                                  `角色 ${index + 1}`;
                                const active =
                                  activeStoryboard.charactersInShot.includes(
                                    name,
                                  );
                                return (
                                  <button
                                    key={character.id || index}
                                    type="button"
                                    onClick={() => toggleCharacterInShot(name)}
                                    className={`rounded-full border px-3 py-1.5 text-sm ${
                                      active
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "hover:bg-muted"
                                    }`}
                                  >
                                    {name}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                还没有角色资产，可以先到角色页创建。
                              </div>
                            )}
                          </div>
                        </div>

                        <AssetSelector
                          title="角色资产参考"
                          description="勾选角色参考图，让 AI 生图更稳定。"
                          options={characterAssetOptions}
                          selectedIds={
                            activeStoryboard.selectedCharacterAssetIds
                          }
                          onToggle={(assetId) =>
                            toggleAssetSelection("character", assetId)
                          }
                          emptyText="暂无角色资产"
                        />

                        <AssetSelector
                          title="场景资产参考"
                          description="勾选场景设定图，帮助镜头保持环境统一。"
                          options={sceneAssetOptions}
                          selectedIds={activeStoryboard.selectedSceneAssetIds}
                          onToggle={(assetId) =>
                            toggleAssetSelection("scene", assetId)
                          }
                          emptyText="暂无场景资产"
                        />
                      </div>
                    </section>
                  </div>

                  <div className="flex-1 shrink-0 overflow-auto">
                    <div className="space-y-3">
                      <section className="rounded-xl border p-3">
                        <div className="mb-3 text-sm font-medium">分镜图预览</div>
                        {activeStoryboard.imageUrl ? (
                          <img
                            src={activeStoryboard.imageUrl}
                            alt={activeStoryboard.title}
                            className="aspect-video w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                            onClick={() => setStoryboardPreviewImage(activeStoryboard.imageUrl)}
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center rounded-lg bg-muted/50 text-sm text-muted-foreground">
                            尚未生成分镜图
                          </div>
                        )}
                      </section>

                    <section className="rounded-xl border p-3">
                      <div className="mb-3 text-sm font-medium">生图提示词</div>
                      <div className="space-y-3">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            正向提示词
                          </span>
                          <div className="relative">
                            <textarea
                              value={activeStoryboard.imagePrompt}
                              onChange={(event) => {
                                handleImagePromptChange(event.target.value);
                                updateDraft({ imagePrompt: event.target.value });
                              }}
                              onKeyDown={handleMentionKeyDown}
                              placeholder="输入@选择角色或场景资产作为参考"
                              className="min-h-[160px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {showMentionDropdown && mentionOptions.length > 0 && (
                              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-card shadow-lg">
                                {mentionOptions.map((option, index) => (
                                  <button
                                    key={option.id}
                                    onClick={() => handleSelectMention(option)}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted ${
                                      index === mentionDropdownIndex ? 'bg-muted' : ''
                                    }`}
                                  >
                                    <img
                                      src={option.imageUrl}
                                      alt={option.name}
                                      className="h-8 w-8 rounded object-cover"
                                    />
                                    <span className="text-sm">{option.type === 'scene' ? '[场景] ' : ''}{option.name}</span>
                                    {option.comfyAssetId && <span className="ml-2 text-xs text-muted-foreground">({option.comfyAssetId})</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            负向提示词
                          </span>
                          <textarea
                            value={activeStoryboard.negativePrompt}
                            onChange={(event) =>
                              updateDraft({
                                negativePrompt: event.target.value,
                              })
                            }
                            className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Clapperboard size={48} className="mx-auto mb-4 opacity-50" />
                <p>从左侧选择一个分镜，或先生成分镜列表。</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {scriptPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex w-full max-w-2xl flex-col rounded-xl bg-card shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-medium">选择剧本</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  从已有剧本中选择一版，用于生成新的分镜候选列表。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScriptPickerOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-auto p-4">
              {scripts.map((script: any, index: number) => {
                const active = selectedScriptForGeneration === index;
                return (
                  <label
                    key={script.id || index}
                    className={`block cursor-pointer rounded-xl border p-4 ${
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={active}
                      onChange={() => setSelectedScriptForGeneration(index)}
                      className="mr-2"
                    />
                    <span className="font-medium">
                      {sanitizeText(script.title) || `剧本 ${index + 1}`}
                    </span>
                    <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                      {getScriptContent(script) || "暂无剧本内容"}
                    </p>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 border-t p-4">
              <button
                type="button"
                onClick={() => setScriptPickerOpen(false)}
                className="rounded-lg border px-4 py-2 hover:bg-muted"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void generateStoryboardsFromScript()}
                disabled={generatingFromScript}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {generatingFromScript ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    生成中
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    生成
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-card shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">分镜预览</h3>
                  {generatingFromScript && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      生成中 {generationProgress.current}/{generationProgress.total}
                    </span>
                  )}
                  {!generatingFromScript && (
                    <span className="rounded bg-green-500/10 px-2 py-0.5 text-xs text-green-500">
                      已完成
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  勾选要保留的分镜，再插入当前列表。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm text-muted-foreground">
                已选 {selectedCandidateIds.length} /{" "}
                {generatedCandidates.length}
              </div>
              {generatingFromScript && generationProgress.total > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {generationProgress.current}/{generationProgress.total}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCandidateIds(
                      generatedCandidates.map((item) => item.id),
                    )
                  }
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  <CheckSquare size={14} />
                  全选
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCandidateIds([])}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="grid flex-1 gap-4 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-3">
              {generatedCandidates.map((item, index) => {
                const active = selectedCandidateIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex cursor-pointer flex-col rounded-xl border p-4 ${
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedCandidateIds((current) => [
                              ...current,
                              item.id,
                            ]);
                          } else {
                            setSelectedCandidateIds((current) =>
                              current.filter((id) => id !== item.id),
                            );
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-primary">
                          候选镜头 {index + 1}
                        </div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.sceneLabel} · {item.shotType}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          景别
                        </div>
                        <div className="line-clamp-2">
                          {item.shotType || "未设置"}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 border-t p-4">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg border px-4 py-2 hover:bg-muted"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void insertSelectedCandidates()}
                disabled={selectedCandidateIds.length === 0}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                保存并插入列表
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {storyboardPreviewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setStoryboardPreviewImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setStoryboardPreviewImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={storyboardPreviewImage}
            alt="预览"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
