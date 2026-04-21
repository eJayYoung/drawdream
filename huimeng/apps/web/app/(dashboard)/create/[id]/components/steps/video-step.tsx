"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Clapperboard,
  Download,
  Film,
  Square,
} from "lucide-react";
import { ErrorBanner } from "../error-banner";
import { useCreateWorkflowStore } from "../../workflow-store";

type StoryboardSource = {
  id: string;
  title: string;
  shotNumber: number;
  sceneNumber: number;
  sceneLabel: string;
  shotType: string;
  beat: string;
  durationSeconds: number;
};

type VideoResultItem = {
  id: string;
  title: string;
  storyboardId: string;
  storyboardTitle: string;
  videoUrl: string;
  status: "queued" | "running" | "completed" | "failed";
  prompt: string;
  error: string;
  selected: boolean;
  createdAt: string;
};

type OrderedClipItem = {
  storyboard: StoryboardSource;
  video: VideoResultItem | null;
};

const sanitizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\uFFFD/g, "")
    .trim();
};

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
  durationSeconds:
    Number.isFinite(Number(raw?.durationSeconds)) &&
    Number(raw?.durationSeconds) > 0
      ? Number(raw?.durationSeconds)
      : 4,
});

const normalizeVideoResults = (items: any[]): VideoResultItem[] =>
  (items || [])
    .map((item, index) => ({
      id: item?.id || `video-${index}`,
      title: sanitizeText(item?.title) || `分镜视频 ${index + 1}`,
      storyboardId: sanitizeText(item?.storyboardId),
      storyboardTitle: sanitizeText(item?.storyboardTitle),
      videoUrl: sanitizeText(item?.videoUrl || item?.video),
      status:
        item?.status === "queued" ||
        item?.status === "running" ||
        item?.status === "completed" ||
        item?.status === "failed"
          ? item.status
          : sanitizeText(item?.videoUrl || item?.video)
            ? "completed"
            : "queued",
      prompt: sanitizeText(item?.prompt),
      error: sanitizeText(item?.error),
      selected: Boolean(item?.selected),
      createdAt: item?.createdAt || new Date().toISOString(),
    }))
    .filter((item) => item.storyboardId);

const triggerDownload = (url: string, filename: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const buildDownloadName = (clip: OrderedClipItem) => {
  const storyboard = clip.storyboard;
  return `shot-${String(storyboard.shotNumber).padStart(2, "0")}.mp4`;
};

export function VideoStep() {
  const {
    error,
    setError,
    clearError,
    storyboardsResult,
    videosResult,
    updateStepStatus,
  } = useCreateWorkflowStore((state) => ({
    error: state.error,
    setError: state.setError,
    clearError: state.clearError,
    storyboardsResult: state.storyboardsResult,
    videosResult: state.videosResult,
    updateStepStatus: state.updateStepStatus,
  }));

  const storyboards = useMemo(
    () =>
      (storyboardsResult || []).map((item, index) =>
        normalizeStoryboard(item, index),
      ),
    [storyboardsResult],
  );

  const videos = useMemo(
    () => normalizeVideoResults(videosResult || []),
    [videosResult],
  );

  const orderedClips = useMemo<OrderedClipItem[]>(() => {
    return storyboards.map((storyboard) => {
      const matchedVideos = videos
        .filter(
          (video) =>
            video.storyboardId === storyboard.id &&
            video.status === "completed" &&
            !!video.videoUrl,
        )
        .sort((a, b) => {
          if (a.selected !== b.selected) {
            return a.selected ? -1 : 1;
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

      return {
        storyboard,
        video: matchedVideos[0] || null,
      };
    });
  }, [storyboards, videos]);

  const availableClipIds = useMemo(
    () =>
      orderedClips
        .filter((clip) => !!clip.video?.videoUrl)
        .map((clip) => clip.storyboard.id),
    [orderedClips],
  );

  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);

  useEffect(() => {
    const hasCompleted = orderedClips.some((clip) => !!clip.video?.videoUrl);
    updateStepStatus("video", hasCompleted ? "completed" : "pending");
  }, [orderedClips, updateStepStatus]);

  useEffect(() => {
    setSelectedClipIds((current) => {
      if (availableClipIds.length === 0) return [];
      if (current.length === 0) return availableClipIds;

      const nextSelected = current.filter((id) =>
        availableClipIds.includes(id),
      );
      const missingDefaults = availableClipIds.filter(
        (id) => !nextSelected.includes(id),
      );
      return [...nextSelected, ...missingDefaults];
    });
  }, [availableClipIds]);

  const selectedClips = orderedClips.filter(
    (clip) =>
      selectedClipIds.includes(clip.storyboard.id) && !!clip.video?.videoUrl,
  );

  const allSelected =
    availableClipIds.length > 0 &&
    availableClipIds.every((id) => selectedClipIds.includes(id));

  const toggleClipSelection = (storyboardId: string) => {
    setSelectedClipIds((current) =>
      current.includes(storyboardId)
        ? current.filter((id) => id !== storyboardId)
        : [...current, storyboardId],
    );
  };

  const handleToggleAll = () => {
    setSelectedClipIds(allSelected ? [] : availableClipIds);
  };

  const handleDownloadSingle = (clip: OrderedClipItem) => {
    if (!clip.video?.videoUrl) {
      setError("这个分镜还没有可下载的视频素材。");
      return;
    }

    clearError();
    triggerDownload(clip.video.videoUrl, buildDownloadName(clip));
  };

  const handleDownloadSelected = () => {
    if (selectedClips.length === 0) {
      setError("请先选择至少一个可下载的视频素材。");
      return;
    }

    clearError();
    selectedClips.forEach((clip, index) => {
      window.setTimeout(() => {
        if (clip.video?.videoUrl) {
          triggerDownload(clip.video.videoUrl, buildDownloadName(clip));
        }
      }, index * 180);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {selectedClips.length > 0
            ? `已选中 ${selectedClips.length} 条分镜视频素材，可直接下载去外部剪辑`
            : orderedClips.some((clip) => !!clip.video?.videoUrl)
              ? "按分镜顺序整理好了视频素材，默认全选"
              : "这里不做剪辑，只整理分镜视频素材供下载"}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={availableClipIds.length === 0}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {allSelected ? "取消全选" : "全选"}
          </button>

          <button
            type="button"
            onClick={handleDownloadSelected}
            disabled={selectedClips.length === 0}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Download size={16} />
            下载所选
          </button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3">
          <div>
            <div className="text-sm font-medium">分镜视频素材轨道</div>
            <div className="text-xs text-muted-foreground">
              按分镜顺序横向排列，像剪辑软件的素材轨道一样查看和下载
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            共 {orderedClips.length} 个分镜
          </div>
        </div>

        {orderedClips.length > 0 ? (
          <div className="overflow-x-auto p-4">
            <div className="flex min-w-max items-start gap-4 pb-2">
              {orderedClips.map((clip) => {
                const isSelected = selectedClipIds.includes(clip.storyboard.id);
                const isAvailable = !!clip.video?.videoUrl;

                return (
                  <div
                    key={clip.storyboard.id}
                    className={`w-[320px] flex-shrink-0 rounded-xl border p-3 ${
                      isSelected && isAvailable
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-primary">
                          镜头{" "}
                          {clip.storyboard.shotNumber
                            .toString()
                            .padStart(2, "0")}
                        </div>
                        <div className="truncate text-sm font-medium">
                          {clip.storyboard.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {clip.storyboard.sceneLabel} ·{" "}
                          {clip.storyboard.shotType}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleClipSelection(clip.storyboard.id)}
                        disabled={!isAvailable}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        title={isSelected ? "取消选择" : "选择素材"}
                      >
                        {isSelected && isAvailable ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </div>

                    <div className="mb-3 aspect-video overflow-hidden rounded-lg bg-black">
                      {clip.video?.videoUrl ? (
                        <video
                          src={clip.video.videoUrl}
                          controls
                          preload="metadata"
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/80">
                          这个分镜还没有生成视频素材
                        </div>
                      )}
                    </div>

                    <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{clip.storyboard.durationSeconds}s</span>
                      <span>{isAvailable ? "可下载" : "缺少素材"}</span>
                    </div>

                    <div className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                      {clip.storyboard.beat || "这个分镜还没有补充剧情节拍"}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadSingle(clip)}
                        disabled={!clip.video?.videoUrl}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        <Download size={14} />
                        单独下载
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center">
              <Film size={44} className="mx-auto mb-4 opacity-50" />
              <p>还没有分镜数据，暂时无法整理成片素材。</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        这里只负责整理和下载分镜视频素材，不做在线剪辑。下载后你可以直接交给剪辑师，或者导入剪辑软件继续处理。
      </div>
    </div>
  );
}
