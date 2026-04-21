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
  title: string;
  shotNumber: number;
  sceneNumber: number;
  sceneId: string;
  sceneLabel: string;
  beat: string;
  narrativePurpose: string;
  dramaticConflict: string;
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
  action: string;
  dialogue: string;
  narration: string;
  soundDesign: string;
  continuityNotes: string;
  directorNotes: string;
  imagePrompt: string;
  negativePrompt: string;
  imageUrl: string;
  generationStatus: "idle" | "queued" | "generating" | "completed" | "failed";
  generationTaskId: string;
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
    storyboard.beat ? `剧情节拍 ${storyboard.beat}` : "",
    storyboard.narrativePurpose
      ? `叙事目标 ${storyboard.narrativePurpose}`
      : "",
    storyboard.shotType ? `景别 ${storyboard.shotType}` : "",
    storyboard.cameraAngle ? `机位 ${storyboard.cameraAngle}` : "",
    storyboard.cameraMovement ? `运镜 ${storyboard.cameraMovement}` : "",
    storyboard.composition ? `构图 ${storyboard.composition}` : "",
    storyboard.lens ? `镜头焦段 ${storyboard.lens}` : "",
    storyboard.emotionTone ? `情绪 ${storyboard.emotionTone}` : "",
    storyboard.charactersInShot?.length
      ? `画面角色 ${storyboard.charactersInShot.join("、")}`
      : "",
    storyboard.action ? `画面动作 ${storyboard.action}` : "",
    storyboard.dialogue ? `对白语境 ${storyboard.dialogue}` : "",
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
    sanitizeText(raw?.action),
    sanitizeText(raw?.dialogue),
    sanitizeText(raw?.narration),
    sanitizeText(raw?.imagePrompt),
    sanitizeText(raw?.beat),
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
    title: sanitizeText(raw?.title) || `镜头 ${index + 1}`,
    shotNumber: normalizeNumber(raw?.shotNumber, index + 1),
    sceneNumber,
    sceneId: raw?.sceneId || matchedScene?.id || "",
    sceneLabel:
      sanitizeText(
        raw?.sceneLabel || matchedScene?.name || matchedScene?.location,
      ) || `场景 ${sceneNumber}`,
    beat: sanitizeText(
      raw?.beat ||
        matchedScene?.name ||
        matchedScene?.description ||
        raw?.description,
    ),
    narrativePurpose: sanitizeText(raw?.narrativePurpose || raw?.objective),
    dramaticConflict: sanitizeText(raw?.dramaticConflict || raw?.conflict),
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
    action: sanitizeText(raw?.action || raw?.description),
    dialogue: sanitizeText(raw?.dialogue),
    narration: sanitizeText(raw?.narration),
    soundDesign: sanitizeText(raw?.soundDesign),
    continuityNotes: sanitizeText(raw?.continuityNotes),
    directorNotes: sanitizeText(raw?.directorNotes),
    imagePrompt: sanitizeText(raw?.imagePrompt),
    negativePrompt:
      sanitizeText(raw?.negativePrompt) || DEFAULT_NEGATIVE_PROMPT,
    imageUrl: sanitizeText(raw?.imageUrl),
    generationStatus:
      raw?.generationStatus || (raw?.imageUrl ? "completed" : "idle"),
    generationTaskId: sanitizeText(raw?.generationTaskId),
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
  const [selectedScriptForGeneration, setSelectedScriptForGeneration] =
    useState(0);
  const [generatingFromScript, setGeneratingFromScript] = useState(false);
  const [generatedCandidates, setGeneratedCandidates] = useState<
    StoryboardItem[]
  >([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [generatingImageForId, setGeneratingImageForId] = useState<
    string | null
  >(null);

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

    try {
      const response = await fetch(
        `${API_URL}/api/workflow/projects/${projectId}/storyboards`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scriptContent }),
        },
      );

      if (!response.ok) {
        throw new Error("分镜生成失败，请稍后重试。");
      }

      const generated = await response.json();
      const candidates = (Array.isArray(generated) ? generated : []).map(
        (item, index) =>
          normalizeStoryboard(
            {
              ...item,
              id: `candidate-${Date.now()}-${index}`,
              source: "ai",
            },
            index,
            scenesResult,
            charactersResult,
          ),
      );

      if (candidates.length === 0) {
        throw new Error("AI 没有返回可用分镜，请检查剧本内容是否完整。");
      }

      setGeneratedCandidates(candidates);
      setSelectedCandidateIds(candidates.map((item) => item.id));
      setPreviewOpen(true);
      setScriptPickerOpen(false);
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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

  const waitForTaskCompletion = async (taskId: string, token: string) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const response = await fetch(
        `${API_URL}/api/generation/tasks/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );

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
      ].filter(Boolean),
    ).slice(0, 3);

    let taskType =
      project?.aspectRatio === "9:16"
        ? "scene_image_portrait"
        : "scene_image_landscape";
    let inputParams: Record<string, unknown> = {
      prompt,
      negative_prompt: negativePrompt,
    };

    if (references.length > 1) {
      taskType = "multi_ref_image";
      inputParams = {
        reference_images: references,
        prompt,
        negative_prompt: negativePrompt,
      };
    } else if (references.length === 1) {
      taskType = "scene_image_ref";
      inputParams = {
        reference_image: references[0],
        prompt,
        negative_prompt: negativePrompt,
      };
    }

    const workingItem = normalizeStoryboard(
      {
        ...activeStoryboard,
        imagePrompt: prompt,
        negativePrompt,
        generationStatus: "queued",
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
      const queueResponse = await fetch(`${API_URL}/api/generation/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          taskType,
          inputParams,
        }),
      });

      if (!queueResponse.ok) {
        throw new Error("提交分镜图任务失败。");
      }

      const queuedTask = await queueResponse.json();
      const generatingItem = normalizeStoryboard(
        {
          ...workingItem,
          generationStatus: "generating",
          generationTaskId: queuedTask.taskId || "",
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
      );
      const images = extractTaskImages(completedTask.outputResult);
      if (images.length === 0) {
        throw new Error("任务已完成，但没有返回可用图片。");
      }

      const completedItem = normalizeStoryboard(
        {
          ...generatingItem,
          imageUrl: images[0],
          generationStatus: "completed",
          generatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        activeIndex,
        scenesResult,
        charactersResult,
      );
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
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          左侧只显示真实分镜列表，右侧编辑改为手动保存。
        </div>
        <div className="text-muted-foreground">{saveStatusText}</div>
      </div>

      <ErrorBanner error={error} />

      <div className="flex h-[calc(100vh-220px)] gap-3">
        <div className="flex w-[460px] flex-shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/20 p-3">
            <div>
              <div className="text-sm font-medium">分镜列表</div>
              <div className="text-xs text-muted-foreground">
                共 {storyboards.length} 条镜头，选中后可用上下方向键调整顺序
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openScriptPicker}
                disabled={generatingFromScript}
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
                    从剧本生成
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
                          <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {item.beat ||
                              item.action ||
                              "补充这个镜头的剧情节拍与画面动作"}
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

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          {activeStoryboard ? (
            <>
              <div className="flex items-center justify-between border-b bg-muted/20 p-3">
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

              <div className="flex-1 overflow-auto p-3">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_340px]">
                  <div className="space-y-3">
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
                      <div className="mb-3 text-sm font-medium">叙事设计</div>
                      <div className="grid gap-3">
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            剧情节拍
                          </span>
                          <textarea
                            value={activeStoryboard.beat}
                            onChange={(event) =>
                              updateDraft({ beat: event.target.value })
                            }
                            className="min-h-[68px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">
                              叙事目的
                            </span>
                            <textarea
                              value={activeStoryboard.narrativePurpose}
                              onChange={(event) =>
                                updateDraft({
                                  narrativePurpose: event.target.value,
                                })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">
                              冲突焦点
                            </span>
                            <textarea
                              value={activeStoryboard.dramaticConflict}
                              onChange={(event) =>
                                updateDraft({
                                  dramaticConflict: event.target.value,
                                })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                        </div>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            画面动作
                          </span>
                          <textarea
                            value={activeStoryboard.action}
                            onChange={(event) =>
                              updateDraft({ action: event.target.value })
                            }
                            className="min-h-[96px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">对白</span>
                            <textarea
                              value={activeStoryboard.dialogue}
                              onChange={(event) =>
                                updateDraft({ dialogue: event.target.value })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">
                              旁白 / 内心声
                            </span>
                            <textarea
                              value={activeStoryboard.narration}
                              onChange={(event) =>
                                updateDraft({ narration: event.target.value })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">
                              声音设计
                            </span>
                            <textarea
                              value={activeStoryboard.soundDesign}
                              onChange={(event) =>
                                updateDraft({ soundDesign: event.target.value })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                          <label className="space-y-1 text-sm">
                            <span className="text-muted-foreground">
                              连戏备注
                            </span>
                            <textarea
                              value={activeStoryboard.continuityNotes}
                              onChange={(event) =>
                                updateDraft({
                                  continuityNotes: event.target.value,
                                })
                              }
                              className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </label>
                        </div>
                        <label className="space-y-1 text-sm">
                          <span className="text-muted-foreground">
                            导演备注
                          </span>
                          <textarea
                            value={activeStoryboard.directorNotes}
                            onChange={(event) =>
                              updateDraft({ directorNotes: event.target.value })
                            }
                            className="min-h-[84px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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

                  <div className="space-y-3">
                    <section className="rounded-xl border p-3">
                      <div className="mb-3 text-sm font-medium">分镜图预览</div>
                      {activeStoryboard.imageUrl ? (
                        <img
                          src={activeStoryboard.imageUrl}
                          alt={activeStoryboard.title}
                          className="aspect-video w-full rounded-lg object-cover"
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
                          <textarea
                            value={activeStoryboard.imagePrompt}
                            onChange={(event) =>
                              updateDraft({ imagePrompt: event.target.value })
                            }
                            className="min-h-[160px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                          />
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
          <div className="flex w-full max-w-2xl flex-col rounded-xl bg-card shadow-xl">
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
          <div className="flex max-h-[85vh] w-full max-w-5xl flex-col rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-medium">分镜预览</h3>
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
                          剧情节拍
                        </div>
                        <div className="line-clamp-2">
                          {item.beat || "未提取到有效节拍"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          画面动作
                        </div>
                        <div className="line-clamp-3">
                          {item.action || "未提取到有效动作，可插入后再补充"}
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
    </div>
  );
}
