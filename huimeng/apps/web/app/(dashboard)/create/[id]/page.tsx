'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Layers,
  Users,
  Clapperboard,
  Image,
  Film,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Save,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Volume2,
  AlertCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 剧本展示组件
function ScriptDisplay({ data }: { data: any }) {
  let script: any;

  try {
    script = typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return <pre className="text-sm whitespace-pre-wrap">{data}</pre>;
  }

  if (!script.title && !script.episodes) {
    return <pre className="text-sm whitespace-pre-wrap">{data}</pre>;
  }

  return (
    <div className="space-y-6">
      {/* 剧名和梗概 */}
      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center gap-2 mb-3">
          <Film size={18} className="text-primary" />
          <h3 className="font-semibold text-lg">{script.title || '未命名剧集'}</h3>
        </div>
        {script.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {script.summary}
          </p>
        )}
      </div>

      {/* 分集 */}
      {script.episodes?.map((episode: any, epIndex: number) => (
        <div key={epIndex} className="bg-card rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                {episode.number || epIndex + 1}
              </span>
              <h4 className="font-medium">{episode.title || `第${episode.number || epIndex + 1}集`}</h4>
            </div>
            {episode.estimatedDuration && (
              <span className="text-xs text-muted-foreground">
                预计 {Math.floor(episode.estimatedDuration / 60)} 分钟
              </span>
            )}
          </div>

          {episode.summary && (
            <div className="px-4 py-3 border-b bg-primary/5">
              <p className="text-sm text-muted-foreground">{episode.summary}</p>
            </div>
          )}

          {/* 场景列表 */}
          {episode.scenes?.length > 0 && (
            <div className="p-4 space-y-4">
              {episode.scenes.map((scene: any, sceneIndex: number) => (
                <div key={sceneIndex} className="flex gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <span className="w-6 h-6 rounded bg-muted text-xs font-medium flex items-center justify-center flex-shrink-0 mt-1">
                    {scene.scene || sceneIndex + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {scene.location && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {scene.location}
                        </span>
                      )}
                      {scene.time && (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          {scene.time}
                        </span>
                      )}
                    </div>

                    {scene.characters?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scene.characters.map((char: string, charIdx: number) => (
                          <span key={charIdx} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                            {char}
                          </span>
                        ))}
                      </div>
                    )}

                    {scene.action && (
                      <p className="text-sm leading-relaxed">{scene.action}</p>
                    )}

                    {scene.dialogue && (
                      <div className="pl-3 border-l-2 border-primary/30 italic text-sm text-muted-foreground">
                        &ldquo;{scene.dialogue}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  enabled: boolean;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'paused';
};

const initialSteps: WorkflowStep[] = [
  {
    id: 'script',
    title: '创作剧本',
    description: '输入剧本描述，AI为你生成完整剧本',
    icon: FileText,
    enabled: true,
    status: 'pending',
  },
  {
    id: 'episodes',
    title: '智能分集',
    description: '将剧本拆分为多个剧集',
    icon: Layers,
    enabled: true,
    status: 'pending',
  },
  {
    id: 'characters',
    title: '角色与配音',
    description: '创建角色形象，选择配音音色',
    icon: Users,
    enabled: true,
    status: 'pending',
  },
  {
    id: 'storyboard',
    title: '智能分镜',
    description: '生成分镜脚本和镜头描述',
    icon: Clapperboard,
    enabled: true,
    status: 'pending',
  },
  {
    id: 'images',
    title: '分镜图',
    description: '生成每个分镜的高清图片',
    icon: Image,
    enabled: true,
    status: 'pending',
  },
  {
    id: 'video',
    title: '成片',
    description: '合成最终短剧成片',
    icon: Film,
    enabled: true,
    status: 'pending',
  },
];

export default function ProjectCreatePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [steps, setSteps] = useState(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [scriptContent, setScriptContent] = useState('');
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [project, setProject] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [pausedStepId, setPausedStepId] = useState<string | null>(null);
  const [episodesResult, setEpisodesResult] = useState<any[]>([]);
  const [charactersResult, setCharactersResult] = useState<any[]>([]);
  const [storyboardsResult, setStoryboardsResult] = useState<any[]>([]);
  const [imagesResult, setImagesResult] = useState<any[]>([]);
  const [videosResult, setVideosResult] = useState<any[]>([]);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  // Fetch project data on mount
  useEffect(() => {
    const fetchProject = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/projects/${params.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`获取项目失败: ${res.status}`);
        }

        const data = await res.json();
        setProject(data);

        // 回填已保存的内容
        if (data.scriptContent) {
          setScriptResult({ content: data.scriptContent });
          setSteps((prev) =>
            prev.map((s) => (s.id === 'script' ? { ...s, status: 'completed' } : s))
          );
        }
        if (data.episodesData && data.episodesData.length > 0) {
          setEpisodesResult(data.episodesData);
          setSteps((prev) =>
            prev.map((s) => (s.id === 'episodes' ? { ...s, status: 'completed' } : s))
          );
        }
        if (data.charactersData && data.charactersData.length > 0) {
          setCharactersResult(data.charactersData);
          setSteps((prev) =>
            prev.map((s) => (s.id === 'characters' ? { ...s, status: 'completed' } : s))
          );
        }
        if (data.storyboardsData && data.storyboardsData.length > 0) {
          setStoryboardsResult(data.storyboardsData);
          setSteps((prev) =>
            prev.map((s) => (s.id === 'storyboard' ? { ...s, status: 'completed' } : s))
          );
        }
        if (data.imagesData && data.imagesData.length > 0) {
          setImagesResult(data.imagesData);
          setSteps((prev) =>
            prev.map((s) => (s.id === 'images' ? { ...s, status: 'completed' } : s))
          );
        }
        if (data.videoUrl) {
          setVideosResult([{ videoUrl: data.videoUrl, title: '成片' }]);
          setSteps((prev) =>
            prev.map((s) => (s.id === 'video' ? { ...s, status: 'completed' } : s))
          );
        }

        setLoadingProject(false);
      } catch (err: any) {
        console.error('Failed to fetch project:', err);
        setError(err.message);
        setLoadingProject(false);
      }
    };

    fetchProject();
  }, [params.id, router]);

  const toggleStep = (stepId: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, enabled: !step.enabled } : step
      )
    );
  };

  const runStep = async (stepId: string) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const token = getToken();
    if (!token) {
      setError('请先登录');
      return;
    }

    // 检查是否暂停
    const currentStepData = steps.find((s) => s.id === stepId);
    if (currentStepData?.status === 'paused') {
      return;
    }

    // Mark as generating
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'generating' } : s))
    );
    setError('');

    try {
      if (stepId === 'script') {
        // 表单校验：剧本描述不能为空
        if (!scriptContent.trim()) {
          setError('请先输入剧本描述');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        // 调用剧本生成 API
        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: scriptContent,
            projectName: project?.name || '未命名项目',
            style: project?.style || '现代',
          }),
        });

        if (!res.ok) {
          throw new Error('生成失败');
        }

        const data = await res.json();
        setScriptResult(data);
      } else if (stepId === 'episodes') {
        // 智能分集：调用后端 API
        if (!scriptResult?.content) {
          setError('请先生成剧本');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        // 调用后端智能分集 API
        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/episodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scriptContent: typeof scriptResult.content === 'string'
              ? scriptResult.content
              : JSON.stringify(scriptResult.content),
          }),
        });

        if (!res.ok) {
          throw new Error('分集失败');
        }

        const episodes: any[] = await res.json();
        setEpisodesResult(episodes);
      } else if (stepId === 'characters') {
        // 角色与配音：调用LLM生成角色
        if (!scriptResult?.content) {
          setError('请先生成剧本');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scriptContent: typeof scriptResult.content === 'string'
              ? scriptResult.content
              : JSON.stringify(scriptResult.content),
          }),
        });

        if (!res.ok) {
          throw new Error('角色生成失败');
        }

        const characters: any[] = await res.json();
        setCharactersResult(characters);
      } else if (stepId === 'storyboard') {
        // 智能分镜：调用后端 API 为每个 episode 生成分镜
        if (episodesResult.length === 0) {
          setError('请先生成剧本和分集');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        const allStoryboards: any[] = [];
        // 为每个 episode 生成分镜
        for (const episode of episodesResult) {
          if (!episode.id) continue;

          const res = await fetch(`${API_URL}/api/workflow/episodes/${episode.id}/storyboards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });

          if (!res.ok) {
            throw new Error('分镜生成失败');
          }

          const storyboards: any[] = await res.json();
          allStoryboards.push(...storyboards);
        }
        setStoryboardsResult(allStoryboards);
      } else if (stepId === 'images') {
        // 分镜图：暂时跳过，等待后续ComfyUI集成
        // 生成占位图片数据
        const mockImages = storyboardsResult.map((sb: any, i: number) => ({
          id: sb.id,
          sceneNumber: sb.sceneNumber,
          imageUrl: null,
          status: 'pending',
        }));
        setImagesResult(mockImages);
      } else if (stepId === 'video') {
        // 成片：暂时跳过，等待后续ComfyUI集成
        setVideosResult([]);
      }

      // Mark as completed
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'completed' } : s))
      );

      // 保存到后端
      await saveProjectProgress(stepId);

      // Move to next enabled step
      const nextEnabled = steps.findIndex(
        (s, i) => i > stepIndex && s.enabled && s.status === 'pending'
      );
      if (nextEnabled !== -1) {
        setCurrentStep(nextEnabled);
      }
    } catch (err: any) {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'failed' } : s))
      );
      setError(err.message || '生成失败');
    }
  };

  // 保存项目进度到后端
  const saveProjectProgress = async (completedStepId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      if (completedStepId === 'script' && scriptResult?.content) {
        await fetch(`${API_URL}/api/projects/${params.id}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scriptContent: scriptResult.content }),
        });
      } else if (completedStepId === 'episodes' && episodesResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/episodes-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ episodesData: episodesResult }),
        });
      } else if (completedStepId === 'characters' && charactersResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/characters-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ charactersData: charactersResult }),
        });
      } else if (completedStepId === 'storyboard' && storyboardsResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/storyboards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storyboardsData: storyboardsResult }),
        });
      } else if (completedStepId === 'images' && imagesResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/images`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imagesData: imagesResult }),
        });
      } else if (completedStepId === 'video' && videosResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ videoUrl: videosResult[0]?.videoUrl || '' }),
        });
      }
    } catch (err) {
      console.error('Failed to save project progress:', err);
    }
  };

  const resumeStep = async (stepId: string) => {
    // 继续执行暂停的任务
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const token = getToken();
    if (!token) {
      setError('请先登录');
      return;
    }

    setError('');

    try {
      if (stepId === 'script') {
        // 表单校验：剧本描述不能为空
        if (!scriptContent.trim()) {
          setError('请先输入剧本描述');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        // 调用剧本生成 API
        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: scriptContent,
            projectName: project?.name || '未命名项目',
            style: project?.style || '现代',
          }),
        });

        if (!res.ok) {
          throw new Error('生成失败');
        }

        const data = await res.json();
        setScriptResult(data);
      } else if (stepId === 'episodes') {
        // 智能分集：调用后端 API
        if (!scriptResult?.content) {
          setError('请先生成剧本');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        // 调用后端智能分集 API
        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/episodes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scriptContent: typeof scriptResult.content === 'string'
              ? scriptResult.content
              : JSON.stringify(scriptResult.content),
          }),
        });

        if (!res.ok) {
          throw new Error('分集失败');
        }

        const episodes: any[] = await res.json();
        setEpisodesResult(episodes);
      } else if (stepId === 'characters') {
        // 角色与配音：调用LLM生成角色
        if (!scriptResult?.content) {
          setError('请先生成剧本');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        const res = await fetch(`${API_URL}/api/workflow/projects/${params.id}/characters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scriptContent: typeof scriptResult.content === 'string'
              ? scriptResult.content
              : JSON.stringify(scriptResult.content),
          }),
        });

        if (!res.ok) {
          throw new Error('角色生成失败');
        }

        const characters: any[] = await res.json();
        setCharactersResult(characters);
      } else if (stepId === 'storyboard') {
        // 智能分镜：调用后端 API 为每个 episode 生成分镜
        if (episodesResult.length === 0) {
          setError('请先生成剧本和分集');
          setSteps((prev) =>
            prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
          );
          return;
        }

        const allStoryboards: any[] = [];
        // 为每个 episode 生成分镜
        for (const episode of episodesResult) {
          if (!episode.id) continue;

          const res = await fetch(`${API_URL}/api/workflow/episodes/${episode.id}/storyboards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });

          if (!res.ok) {
            throw new Error('分镜生成失败');
          }

          const storyboards: any[] = await res.json();
          allStoryboards.push(...storyboards);
        }
        setStoryboardsResult(allStoryboards);
      } else if (stepId === 'images') {
        // 分镜图：暂时跳过，等待后续ComfyUI集成
        // 生成占位图片数据
        const mockImages = storyboardsResult.map((sb: any, i: number) => ({
          id: sb.id,
          sceneNumber: sb.sceneNumber,
          imageUrl: null,
          status: 'pending',
        }));
        setImagesResult(mockImages);
      } else if (stepId === 'video') {
        // 成片：暂时跳过，等待后续ComfyUI集成
        setVideosResult([]);
      }

      // Mark as completed
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'completed' } : s))
      );

      // 保存到后端
      await saveProjectProgress(stepId);

      // Move to next enabled step
      const nextEnabled = steps.findIndex(
        (s, i) => i > stepIndex && s.enabled && s.status === 'pending'
      );
      if (nextEnabled !== -1) {
        setCurrentStep(nextEnabled);
      }
    } catch (err: any) {
      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, status: 'failed' } : s))
      );
      setError(err.message || '生成失败');
    }
  };

  const runAll = async () => {
    for (let i = currentStep; i < steps.length; i++) {
      if (steps[i].enabled) {
        await runStep(steps[i].id);
      }
    }
  };

  // 保存所有项目数据到后端
  const saveAll = async () => {
    const token = getToken();
    if (!token) {
      alert('请先登录');
      return;
    }

    try {
      // 保存剧本
      if (scriptResult?.content) {
        await fetch(`${API_URL}/api/projects/${params.id}/script`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ scriptContent: scriptResult.content }),
        });
      }

      // 保存分集
      if (episodesResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/episodes-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ episodesData: episodesResult }),
        });
      }

      // 保存角色
      if (charactersResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/characters-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ charactersData: charactersResult }),
        });
      }

      // 保存分镜
      if (storyboardsResult.length > 0) {
        await fetch(`${API_URL}/api/projects/${params.id}/storyboards`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ storyboardsData: storyboardsResult }),
        });
      }

      alert('保存成功');
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败');
    }
  };

  const resetStep = (stepId: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'pending' } : s))
    );
    if (stepId === 'script') {
      setScriptResult(null);
    }
  };

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData?.icon || FileText;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/projects')}
            className="p-2 hover:bg-accent rounded-lg"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {loadingProject ? '加载中...' : (project?.name || '未命名项目')}
            </h1>
            <p className="text-sm text-muted-foreground">
              创作进度：{steps.filter((s) => s.status === 'completed').length}/
              {steps.filter((s) => s.enabled).length} 已完成
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveAll}
            className="px-4 py-2 border rounded-lg hover:bg-accent flex items-center gap-2"
          >
            <Save size={18} />
            保存
          </button>
          <button
            onClick={runAll}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:opacity-90"
          >
            <Sparkles size={18} />
            一键生成
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Workflow steps */}
        <div className="w-80 flex-shrink-0 overflow-y-auto">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = step.status === 'completed';
              const isGenerating = step.status === 'generating';

              return (
                <div
                  key={step.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${isActive ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}
                    ${!step.enabled ? 'opacity-60' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer
                        ${
                          isCompleted
                            ? 'bg-green-500/10 text-green-500'
                            : isGenerating
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted'
                        }
                      `}
                      onClick={() => setCurrentStep(index)}
                    >
                      {isGenerating ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : isCompleted ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <Icon size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => setCurrentStep(index)}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{step.title}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStep(step.id);
                          }}
                          className={`
                            relative w-10 h-5 rounded-full transition-colors
                            ${step.enabled ? 'bg-primary' : 'bg-muted'}
                          `}
                          title={step.enabled ? '关闭AI自动生成' : '开启AI自动生成'}
                        >
                          <span
                            className={`
                              absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                              ${step.enabled ? 'left-5' : 'left-0.5'}
                            `}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {step.enabled ? step.description : '手动配置模式'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Step content */}
        <div className="flex-1 bg-card rounded-xl border overflow-hidden flex flex-col">
          {/* Step header */}
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <StepIcon size={24} className="text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{currentStepData.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {currentStepData.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentStepData.status === 'completed' ? (
                <>
                  <button
                    onClick={() => resetStep(currentStepData.id)}
                    className="p-2 hover:bg-accent rounded-lg"
                    title="重新生成"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
                  >
                    下一步
                    <ChevronRight size={18} />
                  </button>
                </>
              ) : currentStepData.status === 'generating' ? (
                <>
                  <button
                    onClick={() => {
                      setPausedStepId(currentStepData.id);
                      setSteps((prev) =>
                        prev.map((s) => (s.id === currentStepData.id ? { ...s, status: 'paused' } : s))
                      );
                    }}
                    className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-accent"
                  >
                    <Pause size={18} />
                    暂停
                  </button>
                </>
              ) : currentStepData.status === 'paused' ? (
                <>
                  <button
                    onClick={() => {
                      setPausedStepId(null);
                      setSteps((prev) =>
                        prev.map((s) => (s.id === currentStepData.id ? { ...s, status: 'generating' } : s))
                      );
                      // 恢复执行
                      resumeStep(currentStepData.id);
                    }}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:opacity-90"
                  >
                    <Play size={18} />
                    继续
                  </button>
                </>
              ) : currentStepData.status === 'failed' ? (
                <>
                  <button
                    onClick={() => runStep(currentStepData.id)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:opacity-90"
                  >
                    <Play size={18} />
                    立即生成
                  </button>
                  <button
                    onClick={() => runStep(currentStepData.id)}
                    className="p-2 hover:bg-accent rounded-lg text-red-500"
                    title="重试"
                  >
                    <RotateCcw size={18} />
                  </button>
                </>
              ) : currentStepData.enabled ? (
                <button
                  onClick={() => runStep(currentStepData.id)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:opacity-90"
                >
                  <Play size={18} />
                  立即生成
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  手动配置模式
                </span>
              )}
            </div>
          </div>

          {/* Step content area */}
          <div className="flex-1 p-6 overflow-auto">
            {currentStepData.id === 'script' && (
              <div className="space-y-4 h-full flex flex-col">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    剧本描述
                  </label>
                  <textarea
                    value={scriptContent}
                    onChange={(e) => setScriptContent(e.target.value)}
                    placeholder="描述你的剧本故事，AI将基于此生成完整剧本...
例如：讲述一个宇航员在太空站执行任务时意外穿越到古代中国的故事，他必须找到回到未来的方法，同时见证了历史的重要时刻..."
                    className="w-full h-32 p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {(currentStepData.status === 'completed' || scriptResult) && (
                  <div className="flex-1 border rounded-lg p-4 bg-muted/50 overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">生成的剧本</span>
                      <div className="flex items-center gap-2">
                        <button className="p-1.5 hover:bg-accent rounded">
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                    {scriptResult?.content ? (
                      <ScriptDisplay data={scriptResult.content} />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        剧本已生成
                      </div>
                    )}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex-1 border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在调用AI生成剧本...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStepData.id === 'episodes' && (
              <div className="space-y-4 h-full flex flex-col">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex-1 border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在调用AI智能分集...</span>
                    </div>
                  </div>
                )}

                {(currentStepData.status === 'completed' || episodesResult.length > 0) && (
                  <div className="flex-1 border rounded-lg p-4 bg-muted/50 overflow-auto">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium">分集结果 ({episodesResult.length}集)</span>
                    </div>
                    {episodesResult.length > 0 ? (
                      <div className="space-y-4">
                        {episodesResult.map((episode: any, index: number) => {
                          // 解析 scriptContent 获取 scenes
                          let scenes: any[] = [];
                          let summary = episode.summary;
                          try {
                            if (episode.scriptContent) {
                              const parsed = typeof episode.scriptContent === 'string'
                                ? JSON.parse(episode.scriptContent)
                                : episode.scriptContent;
                              if (!summary && parsed.summary) summary = parsed.summary;
                              scenes = parsed.scenes || [];
                            }
                          } catch (e) {
                            console.error('Failed to parse episode scriptContent:', e);
                          }

                          return (
                            <div key={index} className="bg-card rounded-lg border p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                  {episode.episodeNumber || index + 1}
                                </span>
                                <h4 className="font-medium">{episode.title || `第${episode.episodeNumber || index + 1}集`}</h4>
                              </div>
                              {summary && (
                                <p className="text-sm text-muted-foreground mb-3">{summary}</p>
                              )}
                              {scenes.length > 0 && (
                                <div className="space-y-2">
                                  {scenes.map((scene: any, sceneIndex: number) => (
                                    <div key={sceneIndex} className="flex gap-3 p-2 rounded bg-muted/30">
                                      <span className="w-5 h-5 rounded bg-muted text-xs font-medium flex items-center justify-center flex-shrink-0">
                                        {sceneIndex + 1}
                                      </span>
                                      <div className="flex-1 text-sm">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                          {scene.location && <span>{scene.location}</span>}
                                          {scene.time && <span>{scene.time}</span>}
                                        </div>
                                        {scene.action && <p className="mb-1">{scene.action}</p>}
                                        {scene.dialogue && (
                                          <p className="italic text-muted-foreground">&ldquo;{scene.dialogue}&rdquo;</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        分集已完成
                      </div>
                    )}
                  </div>
                )}

                {!episodesResult.length && currentStepData.status !== 'generating' && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Layers size={48} className="mx-auto mb-4 opacity-50" />
                      <p>点击"立即生成"开始智能分集</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStepData.id === 'characters' && (
              <div className="space-y-6">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在调用AI生成角色...</span>
                    </div>
                  </div>
                )}

                {(currentStepData.status === 'completed' || charactersResult.length > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">已创建角色 ({charactersResult.length})</span>
                      <button className="px-4 py-2 border rounded-lg hover:bg-accent text-sm">
                        + 添加角色
                      </button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {charactersResult.map((char: any, index: number) => (
                        <div
                          key={index}
                          className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center text-4xl">
                            {char.gender === '女' ? '👩' : '👨'}
                          </div>
                          <h4 className="font-medium">{char.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {char.role || char.personality}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="mr-2">{char.gender}</span>
                            <span>{char.ageGroup}</span>
                          </div>
                          <button className="mt-3 w-full py-2 border rounded-lg hover:bg-accent text-sm flex items-center justify-center gap-2">
                            <Volume2 size={14} />
                            {char.voiceType || '选择配音'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!charactersResult.length && currentStepData.status !== 'generating' && (
                  <div className="flex items-center justify-center text-muted-foreground py-8">
                    <div className="text-center">
                      <Users size={48} className="mx-auto mb-4 opacity-50" />
                      <p>点击"立即生成"开始创建角色</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStepData.id === 'storyboard' && (
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在生成智能分镜...</span>
                    </div>
                  </div>
                )}

                {(currentStepData.status === 'completed' || storyboardsResult.length > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">分镜列表 ({storyboardsResult.length})</span>
                    </div>
                    <div className="space-y-3">
                      {storyboardsResult.map((sb: any, i: number) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium">{sb.shotType || '中景'}</span>
                            </div>
                          </div>
                          {sb.description && (
                            <p className="text-sm text-muted-foreground mb-2">{sb.description}</p>
                          )}
                          {sb.imagePrompt && (
                            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              {sb.imagePrompt}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!storyboardsResult.length && currentStepData.status !== 'generating' && (
                  <div className="flex items-center justify-center text-muted-foreground py-8">
                    <div className="text-center">
                      <Clapperboard size={48} className="mx-auto mb-4 opacity-50" />
                      <p>点击"立即生成"开始智能分镜</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStepData.id === 'images' && (
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在生成分镜图...</span>
                    </div>
                  </div>
                )}

                {(currentStepData.status === 'completed' || imagesResult.length > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">分镜图 ({imagesResult.length})</span>
                      <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 border rounded-lg hover:bg-accent text-sm">
                          上传参考图
                        </button>
                        <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
                          重新生成
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {imagesResult.map((img: any, i: number) => (
                        <div
                          key={i}
                          className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm overflow-hidden"
                        >
                          {img.imageUrl ? (
                            <img src={img.imageUrl} alt={`分镜 ${i + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <span>分镜 {i + 1}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!imagesResult.length && currentStepData.status !== 'generating' && (
                  <div className="flex items-center justify-center text-muted-foreground py-8">
                    <div className="text-center">
                      <Image size={48} className="mx-auto mb-4 opacity-50" />
                      <p>点击"立即生成"开始生成分镜图</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStepData.id === 'video' && (
              <div className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                {currentStepData.status === 'generating' && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-muted-foreground">正在生成视频...</span>
                    </div>
                  </div>
                )}

                {(currentStepData.status === 'completed' || videosResult.length > 0) && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">成片 ({videosResult.length})</span>
                    </div>
                    <div className="space-y-4">
                      {videosResult.map((video: any, i: number) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="aspect-video bg-black rounded-lg mb-3 flex items-center justify-center">
                            {video.videoUrl ? (
                              <video src={video.videoUrl} controls className="w-full h-full" />
                            ) : (
                              <span className="text-white">视频 {i + 1}</span>
                            )}
                          </div>
                          <h4 className="font-medium">{video.title || `片段 ${i + 1}`}</h4>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {!videosResult.length && currentStepData.status !== 'generating' && (
                  <div className="flex items-center justify-center text-muted-foreground py-8">
                    <div className="text-center">
                      <Film size={48} className="mx-auto mb-4 opacity-50" />
                      <p>点击"立即生成"开始合成成片</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!['script', 'characters', 'images', 'video', 'episodes'].includes(currentStepData.id) && (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <StepIcon size={48} className="mx-auto mb-4 opacity-50" />
                  <p>
                    {currentStepData.enabled
                      ? '点击"立即生成"开始'
                      : '请在左侧配置相关参数'}{currentStepData.title}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
