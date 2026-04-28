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
  saveScriptsToBackend: (scriptsData?: any[], selectedIndex?: number | null) => Promise<void>;
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
        // Fetch project basic info
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

        // Fetch scripts from new endpoint
        let scripts: any[] = [];
        let selectedScriptIndex: number | null = null;
        try {
          const scriptsRes = await fetch(`${API_URL}/api/scripts/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (scriptsRes.ok) {
            scripts = await scriptsRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch scripts:", e);
        }

        // If no scripts but project has selectedScriptId, load content from selected script
        if (scripts.length === 0 && data.selectedScriptId) {
          try {
            const scriptRes = await fetch(`${API_URL}/api/scripts/${data.selectedScriptId}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
            if (scriptRes.ok) {
              const script = await scriptRes.json();
              if (script) {
                scripts = [{ id: script.id, title: script.title || "剧本 1", content: script.content || "" }];
                selectedScriptIndex = 0;
              }
            }
          } catch (e) {
            console.error("Failed to fetch selected script:", e);
          }
        }

        if (scripts.length > 0) {
          selectedScriptIndex = selectedScriptIndex ?? 0;
        }

        const selectedScript =
          selectedScriptIndex !== null && scripts[selectedScriptIndex]
            ? scripts[selectedScriptIndex]
            : null;
        const scriptContent = selectedScript?.content || "";
        const scriptResult = scriptContent ? { content: scriptContent } : null;

        // Fetch characters
        let charactersResult: any[] = [];
        try {
          const charsRes = await fetch(`${API_URL}/api/characters/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (charsRes.ok) {
            charactersResult = await charsRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch characters:", e);
        }

        // Fetch scenes
        let scenesResult: any[] = [];
        try {
          const scenesRes = await fetch(`${API_URL}/api/scenes/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (scenesRes.ok) {
            scenesResult = await scenesRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch scenes:", e);
        }

        // Fetch storyboards
        let storyboardsResult: any[] = [];
        try {
          const sbsRes = await fetch(`${API_URL}/api/storyboards/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (sbsRes.ok) {
            storyboardsResult = await sbsRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch storyboards:", e);
        }

        // Fetch video timelines (images step)
        let imagesResult: any[] = [];
        try {
          const imgRes = await fetch(`${API_URL}/api/video-timelines/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (imgRes.ok) {
            imagesResult = await imgRes.json();
          }
        } catch (e) {
          console.error("Failed to fetch video timelines:", e);
        }

        // Fetch videos
        let videosResult: any[] = [];
        try {
          const vidRes = await fetch(`${API_URL}/api/videos/project/${projectId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (vidRes.ok) {
            const videos = await vidRes.json();
            videosResult = videos.map((v: any) => ({
              id: v.id,
              title: v.title || "成片",
              videoUrl: v.videoUrl || "",
              status: v.status || "idle",
            }));
          }
        } catch (e) {
          console.error("Failed to fetch videos:", e);
        }

        // Update step statuses
        if (scriptContent || scripts.length > 0) {
          const target = steps.find((item) => item.id === "script");
          if (target) target.status = "completed";
        }
        if (charactersResult.length > 0) {
          const target = steps.find((item) => item.id === "characters");
          if (target) target.status = "completed";
        }
        if (scenesResult.length > 0) {
          const target = steps.find((item) => item.id === "scenes");
          if (target) target.status = "completed";
        }
        if (storyboardsResult.length > 0) {
          const target = steps.find((item) => item.id === "storyboard");
          if (target) target.status = "completed";
        }
        if (imagesResult.length > 0) {
          const target = steps.find((item) => item.id === "images");
          if (target) target.status = "completed";
        }
        if (videosResult.length > 0 && videosResult[0]?.videoUrl) {
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
          episodesResult: [],
          charactersResult,
          scenesResult,
          storyboardsResult,
          imagesResult,
          videosResult,
          scripts,
          selectedScriptIndex,
        });
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
      console.log('[saveScriptsToBackend] token:', !!token, 'projectId:', projectId, 'scriptsData:', scriptsData?.length);
      if (!token || !projectId) return;

      const nextScripts = scriptsData ?? get().scripts;
      const nextSelectedIndex =
        selectedIndex === undefined ? get().selectedScriptIndex : selectedIndex;

      try {
        // Save each script to new endpoint
        for (let i = 0; i < nextScripts.length; i++) {
          const script = nextScripts[i];
          const scriptData = {
            id: script.id,
            projectId,
            title: script.title || "剧本",
            content: script.content || "",
            status: "completed",
            orderIndex: i,
          };

          const isNewScript = script.isNew || !script.id || script.id.startsWith("script-");
          if (!isNewScript) {
            // Update existing
            await fetch(`${API_URL}/api/scripts/${script.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(scriptData),
            });
          } else {
            // Create new
            const res = await fetch(`${API_URL}/api/scripts`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(scriptData),
            });
            if (res.ok) {
              const created = await res.json();
              // Update local id using index directly
              nextScripts[i] = { ...script, id: created.id, isNew: false };
            }
          }
        }

        // Update project's selectedScriptId
        const selectedScript = nextScripts[nextSelectedIndex ?? 0];
        if (selectedScript?.id && !selectedScript.id.startsWith("script-")) {
          await fetch(`${API_URL}/api/projects/${projectId}/selected-script`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ selectedScriptId: selectedScript.id }),
          });
        }

        set({ scripts: nextScripts });
      } catch (error) {
        console.error("Failed to save scripts:", error);
      }
    },

    async saveCharactersToBackend(charactersData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      const nextCharacters = charactersData ?? get().charactersResult;

      try {
        for (let i = 0; i < nextCharacters.length; i++) {
          const char = nextCharacters[i];
          const charData = {
            id: char.id,
            projectId,
            name: char.name || "",
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
            assets: char.assets || [],
            status: "completed",
            orderIndex: i,
          };

          const isNew = !char.id || char.id.startsWith("char-");
          if (!isNew) {
            await fetch(`${API_URL}/api/characters/${char.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(charData),
            });
          } else {
            const res = await fetch(`${API_URL}/api/characters`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(charData),
            });
            if (res.ok) {
              const created = await res.json();
              // 关键：保存成功后更新本地状态，清除 isNew 标志
              nextCharacters[i] = { ...char, id: created.id, isNew: false };
            }
          }
        }
        set({ charactersResult: [...nextCharacters] });
      } catch (error) {
        console.error("Failed to save characters:", error);
      }
    },

    async saveScenesToBackend(scenesData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      const nextScenes = scenesData ?? get().scenesResult;

      try {
        for (let i = 0; i < nextScenes.length; i++) {
          const scene = nextScenes[i];
          const sceneData = {
            id: scene.id,
            projectId,
            name: scene.name || "",
            location: scene.location,
            timeOfDay: scene.timeOfDay,
            weather: scene.weather,
            description: scene.description,
            type: scene.type,
            elements: scene.elements || [],
            atmosphere: scene.atmosphere,
            imagePrompt: scene.imagePrompt,
            imageUrl: scene.imageUrl,
            assets: scene.assets || [],
            status: scene.status || "completed",
            orderIndex: i,
          };

          const isNew = !scene.id || scene.id.startsWith("scene-");
          if (!isNew) {
            await fetch(`${API_URL}/api/scenes/${scene.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(sceneData),
            });
          } else {
            const res = await fetch(`${API_URL}/api/scenes`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(sceneData),
            });
            if (res.ok) {
              const created = await res.json();
              nextScenes[i] = { ...scene, id: created.id, isNew: false };
            }
          }
        }
        set({ scenesResult: [...nextScenes] });
      } catch (error) {
        console.error("Failed to save scenes:", error);
      }
    },

    async saveStoryboardsToBackend(storyboardsData) {
      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      const nextStoryboards = storyboardsData ?? get().storyboardsResult;

      try {
        for (let i = 0; i < nextStoryboards.length; i++) {
          const sb = nextStoryboards[i];
          const sbData = {
            id: sb.id,
            projectId,
            title: sb.title || "",
            shotNumber: sb.shotNumber,
            sceneNumber: sb.sceneNumber,
            sceneLabel: sb.sceneLabel,
            shotType: sb.shotType,
            cameraAngle: sb.cameraAngle,
            cameraMovement: sb.cameraMovement,
            beat: sb.beat,
            action: sb.action,
            dialogue: sb.dialogue,
            narration: sb.narration,
            imagePrompt: sb.imagePrompt,
            negativePrompt: sb.negativePrompt,
            imageUrl: sb.imageUrl,
            comfyAssetId: sb.comfyAssetId,
            allImageUrls: sb.allImageUrls || [],
            allComfyAssetIds: sb.allComfyAssetIds || [],
            durationSeconds: sb.durationSeconds || 5,
            status: sb.status || "idle",
            source: sb.source || "ai",
            orderIndex: i,
          };

          const isNew = !sb.id || sb.id.startsWith("storyboard-");
          if (!isNew) {
            await fetch(`${API_URL}/api/storyboards/${sb.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(sbData),
            });
          } else {
            const res = await fetch(`${API_URL}/api/storyboards`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(sbData),
            });
            if (res.ok) {
              const created = await res.json();
              nextStoryboards[i] = { ...sb, id: created.id, isNew: false };
            }
          }
        }
        set({ storyboardsResult: [...nextStoryboards] });
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
          await get().saveScriptsToBackend(state.scripts, state.selectedScriptIndex);
        } else if (stepId === "characters" && state.charactersResult.length > 0) {
          await get().saveCharactersToBackend(state.charactersResult);
        } else if (stepId === "scenes" && state.scenesResult.length > 0) {
          await get().saveScenesToBackend(state.scenesResult);
        } else if (stepId === "storyboard" && state.storyboardsResult.length > 0) {
          await get().saveStoryboardsToBackend(state.storyboardsResult);
        } else if (stepId === "images" && state.imagesResult.length > 0) {
          // Save video timelines
          for (const img of state.imagesResult) {
            const imgData = {
              projectId,
              storyboardId: img.storyboardId,
              label: img.label || "",
              timeSeconds: img.timeSeconds || 0,
              frameNumber: img.frameNumber || 1,
              fps: img.fps || 24,
              prompt: img.prompt,
              notes: img.notes,
              generateCount: img.generateCount || 1,
              selectedVariantId: img.selectedVariantId,
              variants: img.variants || [],
              status: img.status || "idle",
              source: img.source || "ai",
            };

            if (img.id && !img.id.startsWith("keyframe-")) {
              await fetch(`${API_URL}/api/video-timelines/${img.id}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(imgData),
              });
            } else {
              // For new items, include the frontend-generated id so backend uses it
              await fetch(`${API_URL}/api/video-timelines`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ ...imgData, id: img.id }),
              });
            }
          }
        } else if (stepId === "video" && state.videosResult.length > 0) {
          const selectedVideo =
            state.videosResult.find(
              (item: any) => item?.selected && item?.videoUrl,
            ) || state.videosResult.find((item: any) => item?.videoUrl);

          if (selectedVideo?.id && !selectedVideo.id.startsWith("video-")) {
            await fetch(`${API_URL}/api/videos/${selectedVideo.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                projectId,
                title: selectedVideo.title || "成片",
                videoUrl: selectedVideo.videoUrl,
                status: "completed",
              }),
            });
          } else {
            await fetch(`${API_URL}/api/videos`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                projectId,
                title: selectedVideo.title || "成片",
                videoUrl: selectedVideo.videoUrl,
                status: "completed",
              }),
            });
          }
        }
      } catch (error) {
        console.error("Failed to save project progress:", error);
      }
    },

    async saveAll() {
      await Promise.all([
        get().saveProjectProgress("script"),
        get().saveProjectProgress("characters"),
        get().saveProjectProgress("scenes"),
        get().saveProjectProgress("storyboard"),
        get().saveProjectProgress("images"),
        get().saveProjectProgress("video"),
      ]);
    },

    async generateEpisodes() {
      // Episodes generation - delegated to workflow API
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

        set({ storyboardsResult: allStoryboards });
        get().updateStepStatus("storyboard", "completed");
        await get().saveStoryboardsToBackend(allStoryboards);
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
          id: storyboard.id || `keyframe-point-${Date.now()}-${index}`,
          type: "keyframe_point",
          storyboardId: storyboard.id,
          storyboardTitle: storyboard.title,
          label: `关键帧 ${index + 1}`,
          imageUrl: storyboard.imageUrl || null,
          status: "pending",
          timeSeconds: 0,
          frameNumber: 1,
          fps: 24,
          prompt: "",
          notes: "",
          generateCount: 1,
          selectedVariantId: null,
          variants: storyboard.imageUrl
            ? [
                {
                  id: `variant-${Date.now()}-${index}`,
                  imageUrl: storyboard.imageUrl,
                  status: "completed",
                  taskId: "",
                  prompt: "",
                  error: "",
                  createdAt: new Date().toISOString(),
                },
              ]
            : [],
          source: "ai",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

      const token = getToken();
      const projectId = get().projectId;
      if (!token || !projectId) return;

      get().updateStepStatus("video", "generating");
      get().clearError();

      try {
        // 创建视频记录
        const res = await fetch(`${API_URL}/api/videos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId,
            title: "待生成成片",
            videoUrl: "",
            status: "idle",
          }),
        });

        if (res.ok) {
          const created = await res.json();
          set({
            videosResult: [{
              id: created.id,
              title: "待生成成片",
              videoUrl: "",
            }],
          });
        }
        get().updateStepStatus("video", "pending");
      } catch (error) {
        get().updateStepStatus("video", "failed");
        set({ error: "初始化视频失败" });
      }
    },
  }),
);
