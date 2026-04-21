"use client";

import { create } from "zustand";
import {
  createInitialSteps,
  type WorkflowStep,
  type WorkflowStepId,
  type WorkflowStepStatus,
} from "./workflow-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
};

type InitializeResult = {
  unauthorized?: boolean;
};

type CreateWorkflowStore = {
  projectId: string | null;
  project: any | null;
  loadingProject: boolean;
  error: string;
  steps: WorkflowStep[];
  scriptContent: string;
  scriptResult: any;
  episodesResult: any[];
  charactersResult: any[];
  scenesResult: any[];
  storyboardsResult: any[];
  imagesResult: any[];
  videosResult: any[];
  scripts: any[];
  selectedScriptIndex: number | null;
  initializeProject: (projectId: string) => Promise<InitializeResult>;
  setError: (error: string) => void;
  clearError: () => void;
  setScriptContent: (value: string) => void;
  setScriptResult: (value: any) => void;
  setEpisodesResult: (value: any[]) => void;
  setCharactersResult: (value: any[]) => void;
  setScenesResult: (value: any[]) => void;
  setStoryboardsResult: (value: any[]) => void;
  setImagesResult: (value: any[]) => void;
  setVideosResult: (value: any[]) => void;
  setScripts: (value: any[]) => void;
  setSelectedScriptIndex: (value: number | null) => void;
  selectScript: (index: number | null) => void;
  updateStepStatus: (
    stepId: WorkflowStepId,
    status: WorkflowStepStatus,
  ) => void;
  saveScriptsToBackend: (
    scriptsData?: any[],
    selectedIndex?: number | null,
  ) => Promise<void>;
  saveCharactersToBackend: (charactersData?: any[]) => Promise<void>;
  saveScenesToBackend: (scenesData?: any[]) => Promise<void>;
  saveStoryboardsToBackend: (storyboardsData?: any[]) => Promise<void>;
  saveProjectProgress: (stepId: WorkflowStepId) => Promise<void>;
  saveAll: () => Promise<void>;
  generateEpisodes: () => Promise<void>;
  generateStoryboards: () => Promise<void>;
  generateImages: () => Promise<void>;
  generateVideo: () => Promise<void>;
};

const createEmptyState = (projectId: string | null = null) => ({
  projectId,
  project: null,
  loadingProject: true,
  error: "",
  steps: createInitialSteps(),
  scriptContent: "",
  scriptResult: null,
  episodesResult: [],
  charactersResult: [],
  scenesResult: [],
  storyboardsResult: [],
  imagesResult: [],
  videosResult: [],
  scripts: [],
  selectedScriptIndex: null,
});

const getScriptPayload = (scriptResult: any) => {
  if (!scriptResult?.content) return "";
  return typeof scriptResult.content === "string"
    ? scriptResult.content
    : JSON.stringify(scriptResult.content);
};

export const useCreateWorkflowStore = create<CreateWorkflowStore>(
  (set, get) => ({
    ...createEmptyState(),

    async initializeProject(projectId) {
      const token = getToken();
      if (!token) {
        return { unauthorized: true };
      }

      set((state) =>
        state.projectId === projectId
          ? { loadingProject: true, error: "" }
          : { ...createEmptyState(projectId) },
      );

      try {
        const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`获取项目失败: ${res.status}`);
        }

        const data = await res.json();
        const steps = createInitialSteps(data.projectType);

        let scripts = Array.isArray(data.scriptsData) ? data.scriptsData : [];
        let selectedScriptIndex = data.selectedScriptIndex ?? null;

        if (scripts.length > 0) {
          if (
            selectedScriptIndex === null ||
            selectedScriptIndex >= scripts.length
          ) {
            selectedScriptIndex = 0;
          }
        } else if (data.scriptContent) {
          scripts = [
            {
              id: `script-${Date.now()}`,
              title: "剧本 1",
              content: data.scriptContent,
              createdAt: new Date().toISOString(),
            },
          ];
          selectedScriptIndex = 0;
        }

        const selectedScript =
          selectedScriptIndex !== null && scripts[selectedScriptIndex]
            ? scripts[selectedScriptIndex]
            : null;
        const scriptContent =
          selectedScript?.content || data.scriptContent || "";
        const scriptResult = scriptContent ? { content: scriptContent } : null;

        if (scriptContent) {
          const target = steps.find((item) => item.id === "script");
          if (target) target.status = "completed";
        }
        if (Array.isArray(data.episodesData) && data.episodesData.length > 0) {
          const target = steps.find((item) => item.id === "episodes");
          if (target) target.status = "completed";
        }
        if (
          Array.isArray(data.charactersData) &&
          data.charactersData.length > 0
        ) {
          const target = steps.find((item) => item.id === "characters");
          if (target) target.status = "completed";
        }
        if (Array.isArray(data.scenesData) && data.scenesData.length > 0) {
          const target = steps.find((item) => item.id === "scenes");
          if (target) target.status = "completed";
        }
        if (
          Array.isArray(data.storyboardsData) &&
          data.storyboardsData.length > 0
        ) {
          const target = steps.find((item) => item.id === "storyboard");
          if (target) target.status = "completed";
        }
        if (Array.isArray(data.imagesData) && data.imagesData.length > 0) {
          const target = steps.find((item) => item.id === "images");
          if (target) target.status = "completed";
        }
        if (data.videoUrl) {
          const target = steps.find((item) => item.id === "video");
          if (target) target.status = "completed";
        }

        set({
          projectId,
          project: data,
          loadingProject: false,
          error: "",
          steps,
          scriptContent,
          scriptResult,
          episodesResult: Array.isArray(data.episodesData)
            ? data.episodesData
            : [],
          charactersResult: Array.isArray(data.charactersData)
            ? data.charactersData
            : [],
          scenesResult: Array.isArray(data.scenesData) ? data.scenesData : [],
          storyboardsResult: Array.isArray(data.storyboardsData)
            ? data.storyboardsData
            : [],
          imagesResult: Array.isArray(data.imagesData) ? data.imagesData : [],
          videosResult: data.videoUrl
            ? [{ videoUrl: data.videoUrl, title: "成片" }]
            : [],
          scripts,
          selectedScriptIndex,
        });

        if (!Array.isArray(data.scriptsData) && scripts.length > 0) {
          await get().saveScriptsToBackend(scripts, selectedScriptIndex);
        }
      } catch (error: any) {
        set({
          loadingProject: false,
          error: error.message || "加载项目失败",
        });
      }

      return {};
    },

    setError(error) {
      set({ error });
    },

    clearError() {
      set({ error: "" });
    },

    setScriptContent(value) {
      set({ scriptContent: value });
    },

    setScriptResult(value) {
      set({ scriptResult: value });
    },

    setEpisodesResult(value) {
      set({ episodesResult: value });
    },

    setCharactersResult(value) {
      set({ charactersResult: value });
    },

    setScenesResult(value) {
      set({ scenesResult: value });
    },

    setStoryboardsResult(value) {
      set({ storyboardsResult: value });
    },

    setImagesResult(value) {
      set({ imagesResult: value });
    },

    setVideosResult(value) {
      set({ videosResult: value });
    },

    setScripts(value) {
      set({ scripts: value });
    },

    setSelectedScriptIndex(value) {
      set({ selectedScriptIndex: value });
    },

    selectScript(index) {
      const scripts = get().scripts;
      const nextScript = index !== null ? scripts[index] : null;
      set({
        selectedScriptIndex: index,
        scriptResult: nextScript
          ? { content: nextScript.content || "" }
          : get().scriptResult,
        scriptContent: nextScript?.content || get().scriptContent,
      });
    },

    updateStepStatus(stepId, status) {
      set((state) => ({
        steps: state.steps.map((step) =>
          step.id === stepId ? { ...step, status } : step,
        ),
      }));
    },

    async saveScriptsToBackend(scriptsData, selectedIndex) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      const nextScripts = scriptsData ?? get().scripts;
      const nextSelectedIndex =
        selectedIndex === undefined ? get().selectedScriptIndex : selectedIndex;

      try {
        await fetch(`${API_URL}/api/projects/${projectId}/scripts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scriptsData: nextScripts,
            selectedScriptIndex: nextSelectedIndex,
          }),
        });
      } catch (error) {
        console.error("Failed to save scripts:", error);
      }
    },

    async saveCharactersToBackend(charactersData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      try {
        await fetch(`${API_URL}/api/projects/${projectId}/characters-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            charactersData: charactersData ?? get().charactersResult,
          }),
        });
      } catch (error) {
        console.error("Failed to save characters:", error);
      }
    },

    async saveScenesToBackend(scenesData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      try {
        await fetch(`${API_URL}/api/projects/${projectId}/scenes-data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scenesData: scenesData ?? get().scenesResult,
          }),
        });
      } catch (error) {
        console.error("Failed to save scenes:", error);
      }
    },

    async saveStoryboardsToBackend(storyboardsData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      try {
        await fetch(`${API_URL}/api/projects/${projectId}/storyboards`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            storyboardsData: storyboardsData ?? get().storyboardsResult,
          }),
        });
      } catch (error) {
        console.error("Failed to save storyboards:", error);
      }
    },

    async saveProjectProgress(stepId) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      const state = get();

      try {
        if (stepId === "script" && state.scriptResult?.content) {
          await fetch(`${API_URL}/api/projects/${projectId}/script`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scriptContent: state.scriptResult.content }),
          });
        } else if (stepId === "episodes" && state.episodesResult.length > 0) {
          await fetch(`${API_URL}/api/projects/${projectId}/episodes-data`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ episodesData: state.episodesResult }),
          });
        } else if (
          stepId === "characters" &&
          state.charactersResult.length > 0
        ) {
          await get().saveCharactersToBackend(state.charactersResult);
        } else if (stepId === "scenes" && state.scenesResult.length > 0) {
          await get().saveScenesToBackend(state.scenesResult);
        } else if (
          stepId === "storyboard" &&
          state.storyboardsResult.length > 0
        ) {
          await get().saveStoryboardsToBackend(state.storyboardsResult);
        } else if (stepId === "images" && state.imagesResult.length > 0) {
          await fetch(`${API_URL}/api/projects/${projectId}/images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imagesData: state.imagesResult }),
          });
        } else if (stepId === "video" && state.videosResult.length > 0) {
          const selectedVideo =
            state.videosResult.find(
              (item: any) => item?.selected && item?.videoUrl,
            ) || state.videosResult.find((item: any) => item?.videoUrl);

          await fetch(`${API_URL}/api/projects/${projectId}/video`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              videoUrl: selectedVideo?.videoUrl || "",
            }),
          });
        }
      } catch (error) {
        console.error("Failed to save project progress:", error);
      }
    },

    async saveAll() {
      await Promise.all([
        get().saveProjectProgress("script"),
        get().saveProjectProgress("episodes"),
        get().saveProjectProgress("characters"),
        get().saveProjectProgress("scenes"),
        get().saveProjectProgress("storyboard"),
        get().saveProjectProgress("images"),
        get().saveProjectProgress("video"),
      ]);
    },

    async generateEpisodes() {
      const token = getToken();
      const projectId = get().projectId;
      const scriptPayload = getScriptPayload(get().scriptResult);

      if (!token || !projectId) return;
      if (!scriptPayload) {
        set({ error: "请先准备剧本内容" });
        return;
      }

      get().updateStepStatus("episodes", "generating");
      get().clearError();

      try {
        const res = await fetch(
          `${API_URL}/api/workflow/projects/${projectId}/episodes`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ scriptContent: scriptPayload }),
          },
        );

        if (!res.ok) {
          throw new Error("分集生成失败");
        }

        const episodes = await res.json();
        set({ episodesResult: Array.isArray(episodes) ? episodes : [] });
        get().updateStepStatus("episodes", "completed");
        await get().saveProjectProgress("episodes");
      } catch (error: any) {
        get().updateStepStatus("episodes", "failed");
        set({ error: error.message || "分集生成失败" });
      }
    },

    async generateStoryboards() {
      const token = getToken();
      const projectId = get().projectId;
      const state = get();
      const scriptPayload = getScriptPayload(state.scriptResult);

      if (!token || !projectId) return;
      if (!scriptPayload) {
        set({ error: "请先准备剧本内容" });
        return;
      }

      get().updateStepStatus("storyboard", "generating");
      get().clearError();

      try {
        const allStoryboards: any[] = [];

        if (
          state.project?.projectType === "series" &&
          state.episodesResult.length > 0
        ) {
          for (const episode of state.episodesResult) {
            if (!episode.id) continue;
            const res = await fetch(
              `${API_URL}/api/workflow/episodes/${episode.id}/storyboards`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({}),
              },
            );

            if (!res.ok) {
              throw new Error("分镜生成失败");
            }

            const storyboards = await res.json();
            allStoryboards.push(...storyboards);
          }
        } else {
          const res = await fetch(
            `${API_URL}/api/workflow/projects/${projectId}/storyboards`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ scriptContent: scriptPayload }),
            },
          );

          if (!res.ok) {
            throw new Error("分镜生成失败");
          }

          const storyboards = await res.json();
          allStoryboards.push(...storyboards);
        }

        set({ storyboardsResult: allStoryboards });
        get().updateStepStatus("storyboard", "completed");
        await get().saveProjectProgress("storyboard");
      } catch (error: any) {
        get().updateStepStatus("storyboard", "failed");
        set({ error: error.message || "分镜生成失败" });
      }
    },

    async generateImages() {
      const storyboardsResult = get().storyboardsResult;
      if (storyboardsResult.length === 0) {
        set({ error: "请先生成分镜" });
        return;
      }

      get().updateStepStatus("images", "generating");
      get().clearError();

      const images = storyboardsResult.map(
        (storyboard: any, index: number) => ({
          id: storyboard.id || `storyboard-image-${index}`,
          sceneNumber: storyboard.sceneNumber || index + 1,
          imageUrl: storyboard.imageUrl || null,
          status: "pending",
        }),
      );

      set({ imagesResult: images });
      get().updateStepStatus("images", "completed");
      await get().saveProjectProgress("images");
    },

    async generateVideo() {
      if (get().imagesResult.length === 0) {
        set({ error: "请先准备分镜图" });
        return;
      }

      get().updateStepStatus("video", "generating");
      get().clearError();

      set({
        videosResult: [
          {
            id: "video-placeholder",
            title: "待生成成片",
            videoUrl: "",
          },
        ],
      });
      get().updateStepStatus("video", "completed");
      await get().saveProjectProgress("video");
    },
  }),
);
