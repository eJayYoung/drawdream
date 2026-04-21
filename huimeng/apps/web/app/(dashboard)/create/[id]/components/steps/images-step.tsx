"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  Clapperboard,
  Image as ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { ErrorBanner } from "../error-banner";
import { useCreateWorkflowStore } from "../../workflow-store";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const DEFAULT_NEGATIVE_PROMPT =
  "low quality, blurry, watermark, subtitle, text, malformed hands";
const DEFAULT_FPS = 24;

type StoryboardSource = {
  id: string;
  title: string;
  shotNumber: number;
  sceneNumber: number;
  sceneLabel: string;
  shotType: string;
  beat: string;
  action: string;
  imagePrompt: string;
  negativePrompt: string;
  imageUrl: string;
  durationSeconds: number;
};

type KeyframeVariant = {
  id: string;
  title: string;
  imageUrl: string;
  status: "queued" | "running" | "completed" | "failed";
  taskId: string;
  prompt: string;
  error: string;
  createdAt: string;
};

type KeyframePoint = {
  type: "keyframe_point";
  id: string;
  storyboardId: string;
  storyboardTitle: string;
  label: string;
  timeSeconds: number;
  frameNumber: number;
  fps: number;
  prompt: string;
  notes: string;
  generateCount: number;
  selectedVariantId: string | null;
  variants: KeyframeVariant[];
  createdAt: string;
  updatedAt: string;
};

type ReferenceImageDraft = {
  id: string;
  name: string;
  dataUrl: string;
};

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

const normalizeStoryboard = (raw: any, index: number): StoryboardSource => ({
  id: raw?.id || `storyboard-${index}`,
  title: sanitizeText(raw?.title) || `镜头 ${index + 1}`,
  shotNumber:
    Number.isFinite(Number(raw?.shotNumber)) && Number(raw?.shotNumber) > 0
      ? Number(raw?.shotNumber)
      : index + 1,
  sceneNumber:
    Number.isFinite(Number(raw?.sceneNumber)) && Number(raw?.sceneNumber) > 0
      ? Number(raw?.sceneNumber)
      : index + 1,
  sceneLabel: sanitizeText(raw?.sceneLabel) || `场景 ${index + 1}`,
  shotType: sanitizeText(raw?.shotType) || "中景",
  beat: sanitizeText(raw?.beat),
  action: sanitizeText(raw?.action),
  imagePrompt: sanitizeText(raw?.imagePrompt),
  negativePrompt: sanitizeText(raw?.negativePrompt) || DEFAULT_NEGATIVE_PROMPT,
  imageUrl: sanitizeText(raw?.imageUrl),
  durationSeconds:
    Number.isFinite(Number(raw?.durationSeconds)) &&
    Number(raw?.durationSeconds) > 0
      ? Number(raw?.durationSeconds)
      : 4,
});

const normalizeVariant = (raw: any, index: number): KeyframeVariant => ({
  id: raw?.id || `variant-${index}`,
  title: sanitizeText(raw?.title) || `方案 ${index + 1}`,
  imageUrl: sanitizeText(raw?.imageUrl),
  status:
    raw?.status === "queued" ||
    raw?.status === "running" ||
    raw?.status === "completed" ||
    raw?.status === "failed"
      ? raw.status
      : sanitizeText(raw?.imageUrl)
        ? "completed"
        : "queued",
  taskId: sanitizeText(raw?.taskId),
  prompt: sanitizeText(raw?.prompt),
  error: sanitizeText(raw?.error),
  createdAt: raw?.createdAt || new Date().toISOString(),
});

const normalizeKeyframePoints = (items: any[]): KeyframePoint[] =>
  (items || [])
    .filter((item) => item?.type === "keyframe_point")
    .map((item, index) => ({
      type: "keyframe_point" as const,
      id: item?.id || `keyframe-point-${index}`,
      storyboardId: sanitizeText(item?.storyboardId),
      storyboardTitle: sanitizeText(item?.storyboardTitle),
      label: sanitizeText(item?.label) || `关键帧 ${index + 1}`,
      timeSeconds:
        Number.isFinite(Number(item?.timeSeconds)) &&
        Number(item?.timeSeconds) >= 0
          ? Number(item.timeSeconds)
          : 0,
      frameNumber:
        Number.isFinite(Number(item?.frameNumber)) &&
        Number(item?.frameNumber) > 0
          ? Number(item.frameNumber)
          : 1,
      fps:
        Number.isFinite(Number(item?.fps)) && Number(item?.fps) > 0
          ? Number(item.fps)
          : DEFAULT_FPS,
      prompt: sanitizeText(item?.prompt),
      notes: sanitizeText(item?.notes),
      generateCount:
        Number.isFinite(Number(item?.generateCount)) &&
        Number(item?.generateCount) > 0
          ? Math.min(Number(item.generateCount), 3)
          : 1,
      selectedVariantId: sanitizeText(item?.selectedVariantId) || null,
      variants: Array.isArray(item?.variants)
        ? item.variants.map((variant: any, variantIndex: number) =>
            normalizeVariant(variant, variantIndex),
          )
        : [],
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: item?.updatedAt || new Date().toISOString(),
    }))
    .filter((item) => item.storyboardId);

const findStoryboardIndexById = (
  items: StoryboardSource[],
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取参考图失败"));
    reader.readAsDataURL(file);
  });

const formatTimelineTime = (value: number) => `${value.toFixed(2)}s`;

const buildGenerationPrompt = (
  storyboard: StoryboardSource,
  point: KeyframePoint,
  prompt: string,
  notes: string,
) =>
  [
    storyboard.imagePrompt,
    storyboard.sceneLabel ? `场景 ${storyboard.sceneLabel}` : "",
    storyboard.shotType ? `景别 ${storyboard.shotType}` : "",
    storyboard.beat ? `剧情节拍 ${storyboard.beat}` : "",
    storyboard.action ? `镜头动作 ${storyboard.action}` : "",
    `关键帧时间 ${formatTimelineTime(point.timeSeconds)}`,
    `关键帧帧位 第 ${point.frameNumber} 帧`,
    prompt,
    notes ? `人物状态与站位 ${notes}` : "",
    "cinematic storyboard keyframe, clear staging, dramatic composition, consistent characters",
  ]
    .filter(Boolean)
    .join("，");

export function ImagesStep() {
  const {
    projectId,
    project,
    error,
    setError,
    clearError,
    storyboardsResult,
    imagesResult,
    setImagesResult,
    saveProjectProgress,
    updateStepStatus,
  } = useCreateWorkflowStore((state) => ({
    projectId: state.projectId,
    project: state.project,
    error: state.error,
    setError: state.setError,
    clearError: state.clearError,
    storyboardsResult: state.storyboardsResult,
    imagesResult: state.imagesResult,
    setImagesResult: state.setImagesResult,
    saveProjectProgress: state.saveProjectProgress,
    updateStepStatus: state.updateStepStatus,
  }));

  const storyboards = useMemo(
    () =>
      (storyboardsResult || []).map((item, index) =>
        normalizeStoryboard(item, index),
      ),
    [storyboardsResult],
  );

  const keyframePoints = useMemo(
    () => normalizeKeyframePoints(imagesResult || []),
    [imagesResult],
  );

  const [selectedStoryboardId, setSelectedStoryboardId] = useState<
    string | null
  >(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [fpsDrafts, setFpsDrafts] = useState<Record<string, number>>({});
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [generatorNotes, setGeneratorNotes] = useState("");
  const [generatorCount, setGeneratorCount] = useState(1);
  const [referenceDrafts, setReferenceDrafts] = useState<ReferenceImageDraft[]>(
    [],
  );
  const [uploadingReferences, setUploadingReferences] = useState(false);
  const [submittingGeneration, setSubmittingGeneration] = useState(false);

  useEffect(() => {
    const hasGenerating = keyframePoints.some((point) =>
      point.variants.some(
        (variant) =>
          variant.status === "queued" || variant.status === "running",
      ),
    );
    const hasCompleted = keyframePoints.some((point) =>
      point.variants.some(
        (variant) => variant.status === "completed" && !!variant.imageUrl,
      ),
    );

    if (storyboards.length === 0) {
      setSelectedStoryboardId(null);
      setSelectedPointId(null);
      updateStepStatus(
        "images",
        hasGenerating ? "generating" : hasCompleted ? "completed" : "pending",
      );
      return;
    }

    if (findStoryboardIndexById(storyboards, selectedStoryboardId) === -1) {
      setSelectedStoryboardId(storyboards[0]?.id || null);
    }

    updateStepStatus(
      "images",
      hasGenerating ? "generating" : hasCompleted ? "completed" : "pending",
    );
  }, [keyframePoints, selectedStoryboardId, storyboards, updateStepStatus]);

  const selectedStoryboard =
    storyboards[findStoryboardIndexById(storyboards, selectedStoryboardId)] ||
    null;

  const selectedStoryboardPoints = useMemo(
    () =>
      selectedStoryboard
        ? keyframePoints
            .filter((point) => point.storyboardId === selectedStoryboard.id)
            .sort((a, b) => a.timeSeconds - b.timeSeconds)
        : [],
    [keyframePoints, selectedStoryboard],
  );

  useEffect(() => {
    if (!selectedStoryboard) {
      setSelectedPointId(null);
      return;
    }

    const hasSelectedPoint = selectedStoryboardPoints.some(
      (point) => point.id === selectedPointId,
    );

    if (!hasSelectedPoint) {
      setSelectedPointId(selectedStoryboardPoints[0]?.id || null);
    }
  }, [selectedPointId, selectedStoryboard, selectedStoryboardPoints]);

  const selectedPoint =
    selectedStoryboardPoints.find((point) => point.id === selectedPointId) ||
    null;

  const effectiveFps = selectedStoryboard
    ? fpsDrafts[selectedStoryboard.id] ||
      selectedStoryboardPoints[0]?.fps ||
      DEFAULT_FPS
    : DEFAULT_FPS;

  useEffect(() => {
    if (!selectedPoint || !generatorOpen) return;
    setGeneratorPrompt(selectedPoint.prompt);
    setGeneratorNotes(selectedPoint.notes);
    setGeneratorCount(selectedPoint.generateCount || 1);
    setReferenceDrafts([]);
  }, [generatorOpen, selectedPoint?.id]);

  const generatingCount = keyframePoints.reduce(
    (count, point) =>
      count +
      point.variants.filter(
        (variant) =>
          variant.status === "queued" || variant.status === "running",
      ).length,
    0,
  );

  const getLatestKeyframePoints = () =>
    normalizeKeyframePoints(
      useCreateWorkflowStore.getState().imagesResult || [],
    );

  const syncKeyframePoints = async (
    items: KeyframePoint[],
    persist = false,
  ) => {
    setImagesResult(items);

    const hasGenerating = items.some((point) =>
      point.variants.some(
        (variant) =>
          variant.status === "queued" || variant.status === "running",
      ),
    );
    const hasCompleted = items.some((point) =>
      point.variants.some(
        (variant) => variant.status === "completed" && !!variant.imageUrl,
      ),
    );

    updateStepStatus(
      "images",
      hasGenerating ? "generating" : hasCompleted ? "completed" : "pending",
    );

    if (persist) {
      await saveProjectProgress("images");
    }

    return items;
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
        throw new Error("读取关键帧任务状态失败。");
      }

      const data = await response.json();
      if (data.status === "completed") return data;
      if (data.status === "failed") {
        throw new Error(data.error || "关键帧生成失败。");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("关键帧生成超时，请稍后重试。");
  };

  const handleTimelineClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!selectedStoryboard) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(
      Math.max((event.clientX - rect.left) / rect.width, 0),
      1,
    );
    const rawTime = ratio * selectedStoryboard.durationSeconds;
    const timeSeconds = Number(rawTime.toFixed(2));
    const frameNumber = Math.max(1, Math.round(timeSeconds * effectiveFps));

    const existingPoint = selectedStoryboardPoints.find(
      (point) => point.frameNumber === frameNumber,
    );
    if (existingPoint) {
      setSelectedPointId(existingPoint.id);
      return;
    }

    const now = new Date().toISOString();
    const nextPoint: KeyframePoint = {
      type: "keyframe_point",
      id: `keyframe-point-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      storyboardId: selectedStoryboard.id,
      storyboardTitle: selectedStoryboard.title,
      label: `关键帧 ${selectedStoryboardPoints.length + 1}`,
      timeSeconds,
      frameNumber,
      fps: effectiveFps,
      prompt: "",
      notes: "",
      generateCount: 1,
      selectedVariantId: null,
      variants: [],
      createdAt: now,
      updatedAt: now,
    };

    const nextItems = [...getLatestKeyframePoints(), nextPoint];
    await syncKeyframePoints(nextItems, true);
    setSelectedPointId(nextPoint.id);
  };

  const handleFpsChange = async (value: number) => {
    if (!selectedStoryboard) return;

    const nextFps =
      Number.isFinite(value) && value > 0 ? Math.min(value, 60) : 1;
    setFpsDrafts((current) => ({
      ...current,
      [selectedStoryboard.id]: nextFps,
    }));

    if (selectedStoryboardPoints.length === 0) return;

    const nextItems = getLatestKeyframePoints().map((point) =>
      point.storyboardId === selectedStoryboard.id
        ? {
            ...point,
            fps: nextFps,
            frameNumber: Math.max(1, Math.round(point.timeSeconds * nextFps)),
            updatedAt: new Date().toISOString(),
          }
        : point,
    );

    await syncKeyframePoints(nextItems, true);
  };

  const openGenerator = () => {
    if (!selectedPoint) {
      setError("请先在时间轴上选中一个关键帧点。");
      return;
    }
    clearError();
    setGeneratorOpen(true);
  };

  const handleReferenceUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingReferences(true);
    try {
      const nextDrafts = await Promise.all(
        files.slice(0, 3).map(async (file) => ({
          id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        })),
      );

      setReferenceDrafts((current) => [...current, ...nextDrafts].slice(0, 3));
    } catch (uploadError: any) {
      setError(uploadError.message || "参考图读取失败。");
    } finally {
      setUploadingReferences(false);
      event.target.value = "";
    }
  };

  const handleRemoveReference = (referenceId: string) => {
    setReferenceDrafts((current) =>
      current.filter((item) => item.id !== referenceId),
    );
  };

  const handleGenerateVariants = async () => {
    if (!projectId || !selectedStoryboard || !selectedPoint) return;

    const token = getToken();
    if (!token) {
      setError("登录状态已失效，请重新登录。");
      return;
    }

    const sanitizedPrompt = sanitizeText(generatorPrompt);
    if (!sanitizedPrompt) {
      setError("请先填写关键帧提示词。");
      return;
    }

    const sanitizedNotes = sanitizeText(generatorNotes);
    const quantity = Math.min(Math.max(generatorCount, 1), 3);
    const latestPoints = getLatestKeyframePoints();
    const activePoint =
      latestPoints.find((point) => point.id === selectedPoint.id) ||
      selectedPoint;
    const generatedPrompt = buildGenerationPrompt(
      selectedStoryboard,
      activePoint,
      sanitizedPrompt,
      sanitizedNotes,
    );
    const createdAt = new Date().toISOString();

    const queuedVariants: KeyframeVariant[] = Array.from(
      { length: quantity },
      (_, index) => ({
        id: `variant-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${activePoint.label} 方案 ${activePoint.variants.length + index + 1}`,
        imageUrl: "",
        status: "queued",
        taskId: "",
        prompt: generatedPrompt,
        error: "",
        createdAt,
      }),
    );

    const updatedPoint: KeyframePoint = {
      ...activePoint,
      prompt: sanitizedPrompt,
      notes: sanitizedNotes,
      generateCount: quantity,
      variants: [...activePoint.variants, ...queuedVariants],
      updatedAt: new Date().toISOString(),
    };

    const queuedItems = latestPoints.map((point) =>
      point.id === activePoint.id ? updatedPoint : point,
    );

    setSubmittingGeneration(true);
    clearError();
    await syncKeyframePoints(queuedItems, true);

    const baseReferenceImages = uniqueList(
      [
        selectedStoryboard.imageUrl,
        ...referenceDrafts.map((item) => item.dataUrl),
      ].filter(Boolean),
    );

    const generateSingleVariant = async (variantId: string) => {
      const currentPoints = getLatestKeyframePoints();
      const currentPoint = currentPoints.find(
        (point) => point.id === activePoint.id,
      );
      if (!currentPoint) return;

      const taskType =
        baseReferenceImages.length > 1
          ? "multi_ref_image"
          : baseReferenceImages.length === 1
            ? "scene_image_ref"
            : project?.aspectRatio === "9:16"
              ? "scene_image_portrait"
              : "scene_image_landscape";

      const inputParams: Record<string, unknown> =
        taskType === "multi_ref_image"
          ? {
              reference_images: baseReferenceImages,
              prompt: generatedPrompt,
              negative_prompt:
                selectedStoryboard.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
              filename_prefix: `huimeng/keyframe/${selectedStoryboard.id}/${activePoint.id}-${variantId}`,
            }
          : taskType === "scene_image_ref"
            ? {
                reference_image: baseReferenceImages[0],
                prompt: generatedPrompt,
                negative_prompt:
                  selectedStoryboard.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
                filename_prefix: `huimeng/keyframe/${selectedStoryboard.id}/${activePoint.id}-${variantId}`,
              }
            : {
                prompt: generatedPrompt,
                negative_prompt:
                  selectedStoryboard.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
                filename_prefix: `huimeng/keyframe/${selectedStoryboard.id}/${activePoint.id}-${variantId}`,
              };

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
          throw new Error("提交关键帧任务失败。");
        }

        const queuedTask = await queueResponse.json();
        await syncKeyframePoints(
          getLatestKeyframePoints().map((point) =>
            point.id === activePoint.id
              ? {
                  ...point,
                  variants: point.variants.map((variant) =>
                    variant.id === variantId
                      ? {
                          ...variant,
                          status: "running",
                          taskId: queuedTask.taskId || "",
                        }
                      : variant,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : point,
          ),
          true,
        );

        const completedTask = await waitForTaskCompletion(
          queuedTask.taskId,
          token,
        );
        const images = extractTaskImages(completedTask.outputResult);
        if (images.length === 0) {
          throw new Error("任务已完成，但没有返回图片。");
        }

        await syncKeyframePoints(
          getLatestKeyframePoints().map((point) =>
            point.id === activePoint.id
              ? {
                  ...point,
                  variants: point.variants.map((variant) =>
                    variant.id === variantId
                      ? {
                          ...variant,
                          imageUrl: images[0],
                          status: "completed",
                          error: "",
                        }
                      : variant,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : point,
          ),
          true,
        );
      } catch (submitError: any) {
        await syncKeyframePoints(
          getLatestKeyframePoints().map((point) =>
            point.id === activePoint.id
              ? {
                  ...point,
                  variants: point.variants.map((variant) =>
                    variant.id === variantId
                      ? {
                          ...variant,
                          status: "failed",
                          error: submitError.message || "关键帧生成失败。",
                        }
                      : variant,
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : point,
          ),
          true,
        );
        setError(submitError.message || "关键帧生成失败。");
      }
    };

    try {
      await Promise.allSettled(
        queuedVariants.map((variant) => generateSingleVariant(variant.id)),
      );
    } finally {
      setSubmittingGeneration(false);
    }
  };

  const handleBindVariant = async (variantId: string) => {
    if (!selectedPoint) return;

    const nextItems = getLatestKeyframePoints().map((point) =>
      point.id === selectedPoint.id
        ? {
            ...point,
            selectedVariantId: variantId,
            updatedAt: new Date().toISOString(),
          }
        : point,
    );
    await syncKeyframePoints(nextItems, true);
  };

  const handleDeleteSelectedPoint = async () => {
    if (!selectedPoint) return;

    const hasAssets = selectedPoint.variants.length > 0;
    if (
      hasAssets &&
      !window.confirm("这个关键帧点下面已经有关联图片，确认删除吗？")
    ) {
      return;
    }

    const nextItems = getLatestKeyframePoints().filter(
      (point) => point.id !== selectedPoint.id,
    );
    await syncKeyframePoints(nextItems, true);
    setSelectedPointId(null);
  };

  const secondTickCount = selectedStoryboard
    ? Math.max(Math.ceil(selectedStoryboard.durationSeconds), 1)
    : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {generatingCount > 0
            ? `正在生成 ${generatingCount} 张关键帧图片`
            : keyframePoints.length > 0
              ? `已创建 ${keyframePoints.length} 个关键帧节点`
              : "左侧带入分镜列表，右侧时间轴打点生成关键帧图片"}
        </div>
      </div>

      <ErrorBanner error={error} />

      <div className="flex h-[calc(100vh-260px)] gap-4">
        <div className="flex w-[410px] flex-shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="border-b bg-muted/20 p-3">
            <div className="text-sm font-medium">分镜列表</div>
            <div className="text-xs text-muted-foreground">
              左侧带入上一步分镜，共 {storyboards.length} 条
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-2.5">
            {storyboards.length > 0 ? (
              storyboards.map((item) => {
                const active = item.id === selectedStoryboardId;
                const itemPoints = keyframePoints.filter(
                  (point) => point.storyboardId === item.id,
                );
                const itemGenerating = itemPoints.some((point) =>
                  point.variants.some(
                    (variant) =>
                      variant.status === "queued" ||
                      variant.status === "running",
                  ),
                );

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStoryboardId(item.id)}
                    className={`flex w-full items-start gap-3 rounded-lg border p-2 text-left transition-colors ${
                      active
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="h-[70px] w-24 flex-shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-[70px] w-24 flex-shrink-0 items-center justify-center rounded-md bg-muted text-[11px] text-muted-foreground">
                        未生成分镜图
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-primary">
                        镜头 {item.shotNumber.toString().padStart(2, "0")}
                      </div>
                      <div className="truncate text-sm font-medium">
                        {item.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.sceneLabel} · {item.shotType}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.beat || item.action || "等待补充分镜内容"}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{itemPoints.length} 个关键帧点</span>
                        <span>{itemGenerating ? "生成中" : "待创作"}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex h-full items-center justify-center py-10 text-muted-foreground">
                <div className="text-center">
                  <Clapperboard size={36} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    上一步还没有分镜，暂时不能开始关键帧创作。
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/20 p-3">
            <div>
              <div className="text-sm font-medium">关键帧时间轴</div>
              <div className="text-xs text-muted-foreground">
                {selectedStoryboard
                  ? `当前分镜：${selectedStoryboard.title}`
                  : "请先从左侧选择一个分镜"}
              </div>
            </div>
            {selectedStoryboard ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>FPS</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={effectiveFps}
                  onChange={(event) =>
                    void handleFpsChange(Number(event.target.value || 1))
                  }
                  className="w-20 rounded-lg border px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            ) : null}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {selectedStoryboard ? (
              <div className="space-y-4">
                <div className="rounded-xl border p-4">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                      点击时间轴打点，自动换算到第几秒、第几帧
                    </div>
                    <div className="text-muted-foreground">
                      时长 {selectedStoryboard.durationSeconds}s ·{" "}
                      {effectiveFps}fps
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => void handleTimelineClick(event)}
                    className="relative block h-24 w-full rounded-xl border border-dashed bg-muted/20 px-3 text-left"
                  >
                    <div className="absolute left-3 right-3 top-1/2 h-[2px] -translate-y-1/2 bg-border" />

                    {Array.from({ length: secondTickCount + 1 }).map(
                      (_, index) => {
                        const left =
                          secondTickCount === 0
                            ? 0
                            : (index / secondTickCount) * 100;
                        const secondValue = Math.min(
                          index,
                          Math.round(selectedStoryboard.durationSeconds),
                        );

                        return (
                          <div
                            key={`tick-${index}`}
                            className="absolute bottom-3 top-3"
                            style={{ left: `calc(${left}% - 1px)` }}
                          >
                            <div className="h-full w-px bg-border/70" />
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground">
                              {secondValue}s
                            </div>
                          </div>
                        );
                      },
                    )}

                    {selectedStoryboardPoints.map((point) => {
                      const left =
                        selectedStoryboard.durationSeconds <= 0
                          ? 0
                          : Math.min(
                              (point.timeSeconds /
                                selectedStoryboard.durationSeconds) *
                                100,
                              100,
                            );
                      const active = point.id === selectedPointId;

                      return (
                        <div
                          key={point.id}
                          className="absolute top-1/2 z-10 -translate-y-1/2"
                          style={{ left: `calc(${left}% - 10px)` }}
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedPointId(point.id);
                            }}
                            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary bg-background text-primary"
                            }`}
                          >
                            <Circle size={8} className="fill-current" />
                          </button>
                        </div>
                      );
                    })}
                  </button>
                </div>

                <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <section className="rounded-xl border p-4">
                    <div className="mb-3 text-sm font-medium">关键帧信息</div>
                    {selectedPoint ? (
                      <div className="space-y-3 text-sm">
                        <div className="rounded-lg bg-muted/30 p-3">
                          <div className="font-medium">
                            {selectedPoint.label}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatTimelineTime(selectedPoint.timeSeconds)} · 第{" "}
                            {selectedPoint.frameNumber} 帧
                          </div>
                        </div>
                        <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                          <div>
                            提示词：{selectedPoint.prompt || "还没有填写"}
                          </div>
                          <div className="mt-2">
                            状态描述：{selectedPoint.notes || "还没有填写"}
                          </div>
                          <div className="mt-2">
                            已生成方案：{selectedPoint.variants.length} 张
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={openGenerator}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 hover:bg-muted"
                        >
                          <Plus size={14} />
                          编辑并生成
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSelectedPoint()}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-destructive hover:bg-destructive/5"
                        >
                          <Trash2 size={14} />
                          删除关键帧点
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        先在上方时间轴上打一个点。
                      </div>
                    )}
                  </section>

                  <section className="rounded-xl border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium">关键帧图片方案</div>
                      <div className="text-xs text-muted-foreground">
                        {selectedPoint
                          ? `${selectedPoint.variants.length} 张候选图`
                          : "未选中关键帧"}
                      </div>
                    </div>

                    {selectedPoint ? (
                      selectedPoint.variants.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {selectedPoint.variants.map((variant) => {
                            const active =
                              selectedPoint.selectedVariantId === variant.id;
                            const isRunning =
                              variant.status === "queued" ||
                              variant.status === "running";

                            return (
                              <div
                                key={variant.id}
                                className={`rounded-xl border p-3 ${
                                  active ? "border-primary bg-primary/5" : ""
                                }`}
                              >
                                <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-muted">
                                  {variant.imageUrl ? (
                                    <img
                                      src={variant.imageUrl}
                                      alt={variant.title}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : isRunning ? (
                                    <div className="flex h-full items-center justify-center text-muted-foreground">
                                      <div className="flex flex-col items-center gap-2 text-sm">
                                        <Loader2
                                          size={22}
                                          className="animate-spin"
                                        />
                                        <span>
                                          {variant.status === "queued"
                                            ? "排队中..."
                                            : "生成中..."}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                      {variant.error || "还没有生成"}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">
                                      {variant.title}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                      {variant.status === "completed"
                                        ? "已完成"
                                        : variant.status === "failed"
                                          ? "已失败"
                                          : variant.status === "queued"
                                            ? "排队中"
                                            : "生成中"}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleBindVariant(variant.id)
                                    }
                                    disabled={!variant.imageUrl}
                                    className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                                  >
                                    {active ? "已绑定" : "绑定此图"}
                                  </button>
                                </div>

                                <div className="mt-2 line-clamp-3 text-xs text-muted-foreground">
                                  {variant.prompt}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex h-[240px] items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <ImageIcon
                              size={40}
                              className="mx-auto mb-3 opacity-50"
                            />
                            <p>这个关键帧还没有生成图片。</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <ImageIcon
                            size={40}
                            className="mx-auto mb-3 opacity-50"
                          />
                          <p>选中一个关键帧点后，这里会加载它的图片方案。</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clapperboard size={42} className="mx-auto mb-3 opacity-50" />
                  <p>请先从左侧选择一个分镜。</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {generatorOpen && selectedStoryboard && selectedPoint ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <div className="text-base font-semibold">生成关键帧图片</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPoint.label} ·{" "}
                  {formatTimelineTime(selectedPoint.timeSeconds)} · 第{" "}
                  {selectedPoint.frameNumber} 帧
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratorOpen(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              <div className="overflow-auto border-r p-5">
                <div className="space-y-4">
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">提示词</span>
                    <textarea
                      value={generatorPrompt}
                      onChange={(event) =>
                        setGeneratorPrompt(event.target.value)
                      }
                      placeholder="描述这个关键帧的画面内容、人物状态、镜头重点"
                      className="min-h-[120px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>

                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">状态描述</span>
                    <textarea
                      value={generatorNotes}
                      onChange={(event) =>
                        setGeneratorNotes(event.target.value)
                      }
                      placeholder="人物站位变化、表情、姿态、入画方向、调度变化"
                      className="min-h-[96px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </label>

                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">生成张数</span>
                    <select
                      value={generatorCount}
                      onChange={(event) =>
                        setGeneratorCount(Number(event.target.value || 1))
                      }
                      className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={1}>1 张</option>
                      <option value={2}>2 张</option>
                      <option value={3}>3 张</option>
                    </select>
                  </label>

                  <div className="space-y-2 text-sm">
                    <div className="text-muted-foreground">参考图</div>
                    <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-4 text-sm hover:bg-muted/50">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(event) => void handleReferenceUpload(event)}
                      />
                      {uploadingReferences ? "读取中..." : "上传参考图"}
                    </label>

                    {referenceDrafts.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {referenceDrafts.map((reference) => (
                          <div
                            key={reference.id}
                            className="relative overflow-hidden rounded-lg border"
                          >
                            <img
                              src={reference.dataUrl}
                              alt={reference.name}
                              className="h-24 w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveReference(reference.id)
                              }
                              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                        没有上传参考图时，会优先使用当前分镜图作为参考。
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleGenerateVariants()}
                    disabled={submittingGeneration}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {submittingGeneration ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        生成中
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        开始生成
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="overflow-auto p-5">
                <div className="mb-3 text-sm font-medium">图片预览</div>
                {selectedPoint.variants.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {selectedPoint.variants.map((variant) => {
                      const active =
                        selectedPoint.selectedVariantId === variant.id;
                      const isRunning =
                        variant.status === "queued" ||
                        variant.status === "running";

                      return (
                        <div
                          key={variant.id}
                          className={`rounded-xl border p-3 ${
                            active ? "border-primary bg-primary/5" : ""
                          }`}
                        >
                          <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-muted">
                            {variant.imageUrl ? (
                              <img
                                src={variant.imageUrl}
                                alt={variant.title}
                                className="h-full w-full object-cover"
                              />
                            ) : isRunning ? (
                              <div className="flex h-full items-center justify-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-2 text-sm">
                                  <Loader2 size={22} className="animate-spin" />
                                  <span>
                                    {variant.status === "queued"
                                      ? "排队中..."
                                      : "生成中..."}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                {variant.error || "还没有生成"}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {variant.title}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {variant.status === "completed"
                                  ? "已完成"
                                  : variant.status === "failed"
                                    ? "已失败"
                                    : variant.status === "queued"
                                      ? "排队中"
                                      : "生成中"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleBindVariant(variant.id)}
                              disabled={!variant.imageUrl}
                              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              {active ? "已绑定" : "选择并绑定"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <ImageIcon
                        size={44}
                        className="mx-auto mb-3 opacity-50"
                      />
                      <p>这里会展示这个关键帧点之前生成过的所有图片。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
