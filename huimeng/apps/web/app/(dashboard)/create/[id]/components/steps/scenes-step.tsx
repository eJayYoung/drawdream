'use client';

import { api } from '../../../../../../lib/api';
import { useEffect, useRef, useState } from 'react';
import {
  Edit2,
  Film,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { AssetGeneratorModal } from '../asset-generator-modal';
import { ErrorBanner } from '../error-banner';
import { PanoramaViewer } from '../panorama-viewer';
import { useCreateWorkflowStore } from '../../workflow-store';
import { useSocketIO, type GenerationProgressPayload } from '../../../../../../lib/use-socket-io';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createEmptyAssetForm = () => ({
  type: 'image' as 'image' | 'video',
  prompt: '',
  tags: '',
  angle: '',
  shotSize: '',
});

export function ScenesStep() {
  const {
    projectId,
    error,
    setError,
    steps,
    updateStepStatus,
    scripts,
    selectedScriptIndex,
    scenesResult,
    setScenesResult,
    saveScenesToBackend,
  } = useCreateWorkflowStore((state) => ({
    projectId: state.projectId,
    error: state.error,
    setError: state.setError,
    steps: state.steps,
    updateStepStatus: state.updateStepStatus,
    scripts: state.scripts,
    selectedScriptIndex: state.selectedScriptIndex,
    scenesResult: state.scenesResult,
    setScenesResult: state.setScenesResult,
    saveScenesToBackend: state.saveScenesToBackend,
  }));

  const [selectedSceneIndexInternal, setSelectedSceneIndexInternal] = useState<number | null>(null);
  const [sceneForm, setSceneForm] = useState({
    name: '',
    location: '',
    timeOfDay: '白天',
    weather: '晴朗',
    description: '',
    elements: '',
  });

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState(createEmptyAssetForm());
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const referenceAssetIdRef = useRef<string | undefined>();
  const referenceAssetContentRef = useRef<string | undefined>();

  const [showScriptSelect, setShowScriptSelect] = useState(false);
  const [selectedScriptForAI, setSelectedScriptForAI] = useState<number>(
    selectedScriptIndex ?? 0,
  );
  const [aiGeneratingScenes, setAiGeneratingScenes] = useState(false);
  const [aiGeneratedScenes, setAiGeneratedScenes] = useState<any[]>([]);
  const [selectedSceneIndices, setSelectedSceneIndices] = useState<number[]>([]);
  const [showScenePreview, setShowScenePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [panoramaImage, setPanoramaImage] = useState<string | null>(null);
  const [screenshotUploading, setScreenshotUploading] = useState(false);

  const pendingScenesRef = useRef<Map<string, { sceneIndex: number; assetIndex: number }>>(new Map());

  const [userId, setUserId] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    try {
      if (token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
        );
        const payload = JSON.parse(jsonPayload);
        setUserId(payload.sub || '');
      }
    } catch {
      setUserId('');
    }
  }, []);

  useSocketIO({
    userId,
    projectId: projectId ?? undefined,
    onGenerationProgress: (data: GenerationProgressPayload) => {
      const pending = pendingScenesRef.current;
      const mapping = pending.get(data.taskId);
      if (!mapping) return;

      if (data.status === 'completed') {
        // 直接从数据库获取最新场景数据更新前端状态
        if (mapping.sceneIndex !== null && mapping.sceneIndex !== undefined) {
          const sceneId = scenesResult[mapping.sceneIndex]?.id;
          if (sceneId) {
            const token = localStorage.getItem('accessToken');
            fetch(`${API_URL}/api/scenes/${sceneId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((res) => res.json())
              .then((updatedScene) => {
                const nextScenes = [...scenesResult];
                nextScenes[mapping.sceneIndex] = updatedScene;
                setScenesResult(nextScenes);
              })
              .catch((e) => console.error('Failed to refresh scene:', e));
          }
        }
        pending.delete(data.taskId);
      } else if (data.status === 'failed') {
        pending.delete(data.taskId);
        setError(data.error || '资产生成失败');
      }
    },
  });

  const step = steps.find((item) => item.id === 'scenes');

  const activeIndex = selectedSceneIndexInternal !== null ? selectedSceneIndexInternal : null;
  const activeScene = activeIndex !== null ? scenesResult[activeIndex] : null;

  const persistScenes = async (nextScenes: any[]) => {
    setScenesResult(nextScenes);
    await saveScenesToBackend(nextScenes);
  };

  const resetPreview = () => {
    setShowScenePreview(false);
    setAiGeneratedScenes([]);
    setSelectedSceneIndices([]);
  };

  const handlePanoramaScreenshot = async (blob: Blob) => {
    if (!blob || !activeScene || !projectId || activeIndex === null) return;

    console.log('[截图 blob 大小]', blob.size, 'bytes, type:', blob.type);
    setScreenshotUploading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', blob, `panorama_${activeScene.id}_${Date.now()}.jpg`);
      const res = await fetch(`${API_URL}/api/generation/screenshot/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '截图上传失败');
      }

      const data = await res.json();
      console.log('[截图上传成功]', data);

      const assetUrl = data.url || data.assetUrl || data.filename;

      const nextScenes = [...scenesResult];
      const newAsset = {
        id: `asset-${Date.now()}`,
        type: 'image' as const,
        url: assetUrl,
        comfyAssetId: data.id,
        prompt: `360全景截图 - ${activeScene.name || activeScene.location || '场景'}`,
        createdAt: new Date().toISOString(),
      };

      if (!nextScenes[activeIndex].assets) {
        nextScenes[activeIndex].assets = [];
      }
      nextScenes[activeIndex].assets.push(newAsset);
      await persistScenes(nextScenes);

      setPanoramaImage(null);
    } catch (err: any) {
      console.error('[截图上传失败]', err);
      setError(err.message || '截图上传失败');
    } finally {
      setScreenshotUploading(false);
    }
  };

  const handleSelectScene = (index: number) => {
    setSelectedSceneIndexInternal(index);
    const scene = scenesResult[index];
    if (scene) {
      setSceneForm({
        name: scene.name || '',
        location: scene.location || '',
        timeOfDay: scene.timeOfDay || '白天',
        weather: scene.weather || '晴朗',
        description: scene.description || '',
        elements: Array.isArray(scene.elements) ? scene.elements.join('、') : scene.elements || '',
      });
    }
  };

  const handleSaveScene = async () => {
    if (activeIndex === null) return;
    const nextScenes = [...scenesResult];
    const scene = nextScenes[activeIndex];
    const elementsArray = sceneForm.elements
      ? sceneForm.elements.split('、').map((s) => s.trim()).filter(Boolean)
      : [];
    nextScenes[activeIndex] = {
      ...scene,
      name: sceneForm.name || sceneForm.location || scene.name || `场景 ${activeIndex + 1}`,
      location: sceneForm.location,
      timeOfDay: sceneForm.timeOfDay,
      weather: sceneForm.weather,
      description: sceneForm.description,
      elements: elementsArray,
    };
    await persistScenes(nextScenes);
  };

  const handleDeleteScene = async (index: number) => {
    if (!confirm('确定删除这个场景吗？')) return;

    const sceneToDelete = scenesResult[index];
    const nextScenes = scenesResult.filter((_, i) => i !== index);
    let nextSelectedIndex = selectedSceneIndexInternal;

    if (selectedSceneIndexInternal === index) {
      nextSelectedIndex = null;
    } else if (selectedSceneIndexInternal !== null && selectedSceneIndexInternal > index) {
      nextSelectedIndex = selectedSceneIndexInternal - 1;
    }

    // 先从数据库删除（如果有真实 id）
    if (sceneToDelete?.id) {
      try {
        const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
        await fetch(`${API_URL}/api/scenes/${sceneToDelete.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('删除场景失败:', e);
      }
    }

    setScenesResult(nextScenes);
    setSelectedSceneIndexInternal(nextSelectedIndex);
    if (nextSelectedIndex !== null) {
      setSceneForm({
        name: nextScenes[nextSelectedIndex]?.name || '',
        location: nextScenes[nextSelectedIndex]?.location || '',
        timeOfDay: nextScenes[nextSelectedIndex]?.timeOfDay || '白天',
        weather: nextScenes[nextSelectedIndex]?.weather || '晴朗',
        description: nextScenes[nextSelectedIndex]?.description || '',
        elements: Array.isArray(nextScenes[nextSelectedIndex]?.elements)
          ? nextScenes[nextSelectedIndex].elements.join('、')
          : nextScenes[nextSelectedIndex]?.elements || '',
      });
    } else {
      setSceneForm({
        name: '',
        location: '',
        timeOfDay: '白天',
        weather: '晴朗',
        description: '',
        elements: '',
      });
    }

    // 前端状态已更新，不需要再调用 saveScenesToBackend（upsert 不会删除记录）
  };

  const handleAddScene = async () => {
    const newScene = {
      id: `scene-${Date.now()}`,
      name: '',
      location: '',
      timeOfDay: '白天',
      weather: '晴朗',
      description: '',
      elements: [] as string[],
      assets: [] as any[],
      createdAt: new Date().toISOString(),
    };
    const nextScenes = [...scenesResult, newScene];
    setScenesResult(nextScenes);
    setSelectedSceneIndexInternal(scenesResult.length);
    setSceneForm({
      name: '',
      location: '',
      timeOfDay: '白天',
      weather: '晴朗',
      description: '',
      elements: '',
    });
    await saveScenesToBackend(nextScenes);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ErrorBanner error={error} />


      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Scene List */}
        <div className="flex w-[356px] flex-col overflow-hidden rounded-lg border bg-card shadow-[0_4px_20px_hsl(217.2_60%_45%_/_0.1),_0_2px_8px_hsl(0_0%_0%_/_0.4)]">
          <div className="flex items-center justify-between neon-border-bottom neon-header p-3 shrink-0">
            <span className="text-sm font-medium">场景列表 ({scenesResult.length})</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedScriptForAI(selectedScriptIndex ?? 0);
                  setShowScriptSelect(true);
                }}
                disabled={aiGeneratingScenes || scripts.length === 0}
                className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                <Sparkles size={14} />
                AI 生成
              </button>
              <button
                onClick={handleAddScene}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
              >
                <Plus size={14} />
                新建
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-3">
            {aiGeneratingScenes ? (
              <div className="flex h-32 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 size={32} className="animate-spin" />
                  <span>AI 正在生成场景...</span>
                </div>
              </div>
            ) : scenesResult.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无场景</p>
                </div>
              </div>
            ) : (
              scenesResult.map((scene, index) => (
                <div
                  key={scene.id || index}
                  onClick={() => handleSelectScene(index)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    activeIndex === index
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activeIndex === index && (
                        <MapPin size={14} className="text-primary" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScene(index);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h3 className="truncate text-sm font-medium">
                    {scene.name || scene.location || `场景 ${index + 1}`}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {scene.description ? `${scene.description.slice(0, 60)}...` : '空场景'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail Edit + Assets */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-[0_4px_20px_hsl(217.2_60%_45%_/_0.1),_0_2px_8px_hsl(0_0%_0%_/_0.4)]">
          {activeScene ? (
            <div className="flex h-full">
              {/* Left: Detail Edit */}
              <div className="flex w-[420px] flex-col border-r overflow-hidden shrink-0">
                <div className="flex items-center justify-between neon-border-bottom neon-header p-3 shrink-0">
                  <div>
                    <div className="font-medium">
                      {activeScene.name || activeScene.location || '未命名场景'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activeScene.location || '-'} · {activeScene.timeOfDay || '白天'}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveScene}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                  >
                    保存
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">场景名称</label>
                      <input
                        type="text"
                        value={sceneForm.name}
                        onChange={(e) => setSceneForm((current) => ({ ...current, name: e.target.value }))}
                        placeholder="场景名称"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">地点</label>
                        <input
                          type="text"
                          value={sceneForm.location}
                          onChange={(e) => setSceneForm((current) => ({ ...current, location: e.target.value }))}
                          placeholder="如：道观内、大树上"
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">时间</label>
                        <select
                          value={sceneForm.timeOfDay}
                          onChange={(e) => setSceneForm((current) => ({ ...current, timeOfDay: e.target.value }))}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="清晨">清晨</option>
                          <option value="白天">白天</option>
                          <option value="黄昏">黄昏</option>
                          <option value="傍晚">傍晚</option>
                          <option value="夜晚">夜晚</option>
                          <option value="深夜">深夜</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">天气</label>
                        <select
                          value={sceneForm.weather}
                          onChange={(e) => setSceneForm((current) => ({ ...current, weather: e.target.value }))}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="晴朗">晴朗</option>
                          <option value="阴天">阴天</option>
                          <option value="雨天">雨天</option>
                          <option value="雪天">雪天</option>
                          <option value="雾天">雾天</option>
                          <option value="大风">大风</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">环境描述</label>
                      <textarea
                        value={sceneForm.description}
                        onChange={(e) => setSceneForm((current) => ({ ...current, description: e.target.value }))}
                        placeholder="场景环境、氛围描述..."
                        className="min-h-[100px] w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">场景元素</label>
                      <input
                        type="text"
                        value={sceneForm.elements}
                        onChange={(e) => setSceneForm((current) => ({ ...current, elements: e.target.value }))}
                        placeholder="关键道具、装饰物（用、分隔）"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {activeScene.imageUrl && (
                      <div className="relative">
                        <img
                          src={activeScene.imageUrl}
                          alt="scene"
                          className="h-40 w-full rounded-lg object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Asset Management */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-between neon-border-bottom neon-header p-3 shrink-0">
                  <span className="text-sm font-medium">场景资产</span>
                  <button
                    onClick={() => {
                      // 构建场景图 prompt：环境描述为核心，强调无人物、电影感、细节质感
                      const desc = activeScene.description || '';
                      const location = activeScene.location || '';
                      const timeOfDay = activeScene.timeOfDay || '';
                      const weather = activeScene.weather || '';
                      const basePrompt = [location, timeOfDay, weather, desc].filter(Boolean).join('，');
                      const enhancedPrompt = `${basePrompt}。电影感场景，画面精美，细节丰富，质感强烈，氛围营造到位，无任何人物出现，专注于环境、建筑、道具等视觉元素的细腻呈现。`;

                      setAssetForm({
                        ...createEmptyAssetForm(),
                        prompt: enhancedPrompt,
                      });
                      setReferenceImage(activeScene.imageUrl || null);
                      setShowAssetForm(true);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                  >
                    <Plus size={14} />
                    新建资产
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {(activeScene.assets || []).length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {(activeScene.assets || []).map((asset: any, index: number) => (
                        <div key={asset.id || index} className="overflow-hidden rounded-lg border">
                          <div className="relative aspect-video bg-muted">
                            {asset.type === 'image' ? (
                              asset.url && asset.url !== '/placeholder.png' ? (
                                <div
                                  className="group relative flex h-full cursor-pointer items-center justify-center"
                                  onClick={() => setPreviewImage(asset.url)}
                                >
                                  <img
                                    src={asset.url}
                                    alt={asset.prompt}
                                    className="max-h-full max-w-full object-contain"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPanoramaImage(asset.url);
                                    }}
                                    className="absolute right-2 top-2 z-10 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70"
                                    title="360° VR渲染"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10"/>
                                      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                                      <path d="M2 12h20"/>
                                    </svg>
                                  </button>
                                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 transition-colors group-hover:bg-black/30">
                                    <ZoomIn
                                      size={24}
                                      className="text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center bg-muted/50">
                                  <Loader2 className="animate-spin text-muted-foreground" size={32} />
                                  <span className="ml-2 text-xs text-muted-foreground">生成中...</span>
                                </div>
                              )
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Film size={24} className="text-muted-foreground" />
                              </div>
                            )}
                            <button
                              onClick={async () => {
                                const nextScenes = [...scenesResult];
                                nextScenes[activeIndex!].assets = (
                                  nextScenes[activeIndex!].assets || []
                                ).filter((_: any, assetIndex: number) => assetIndex !== index);
                                await persistScenes(nextScenes);
                              }}
                              className="absolute right-2 bottom-2 rounded bg-black/50 p-1 text-white hover:bg-black/70"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="p-2">
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {asset.prompt}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                      暂无场景资产
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MapPin size={48} className="mx-auto mb-4 opacity-50" />
                <p>选择一个场景查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AssetGeneratorModal
        open={showAssetForm}
        title="新建场景资产"
        assetForm={assetForm}
        setAssetForm={setAssetForm}
        referenceImage={referenceImage}
        setReferenceImage={setReferenceImage}
        onReferenceImageSelected={async (base64Data: string) => {
          const token =
            typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
          try {
            const base64Response = base64Data.split(',')[1];
            const byteCharacters = atob(base64Response);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });

            const formData = new FormData();
            formData.append('file', blob, 'reference.png');

            const { data: uploadRes } = await api.post('/generation/assets/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
              params: { step: 'scenes', projectId, sceneId: activeIndex !== null ? scenesResult[activeIndex]?.id : undefined },
            });
            if (uploadRes?.id && uploadRes?.assetContent) {
              referenceAssetIdRef.current = uploadRes.id;
              referenceAssetContentRef.current = uploadRes.assetName;
              return uploadRes.assetName;
            }
          } catch (uploadError: any) {
            console.error(`Failed to upload reference image: ${uploadError.message}`);
          }
        }}
        generatingAsset={false}
        assetType="scene"
        existingAssets={(activeScene?.assets || []).filter((a: any) => a.type === 'image').map((a: any) => ({
          id: a.id,
          url: a.url,
          name: a.prompt,
          comfyAssetId: a.comfyAssetId,
        }))}
        onExistingAssetSelected={(asset) => {
          referenceAssetIdRef.current = asset.comfyAssetId;
          referenceAssetContentRef.current = asset.name;
        }}
        onClose={() => {
          setShowAssetForm(false);
          setAssetForm(createEmptyAssetForm());
          setReferenceImage(null);
          referenceAssetIdRef.current = undefined;
          referenceAssetContentRef.current = undefined;
        }}
        onSubmit={async () => {
          if (activeIndex === null || !projectId) return;

          setError('');

          const token =
            typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
          const scene = scenesResult[activeIndex];
          // assetForm.prompt 已经包含完整的场景描述，直接使用
          const fullPrompt = assetForm.prompt;

          // 1. Add placeholder asset (only in memory, not saved to DB)
          const nextScenes = [...scenesResult];
          const nextAssets = nextScenes[activeIndex].assets || [];
          const placeholderAssetId = `asset-${Date.now()}`;
          nextAssets.push({
            id: placeholderAssetId,
            type: 'image',
            url: '/placeholder.png',
            prompt: fullPrompt,
            tags: [],
            angle: assetForm.angle,
            shotSize: assetForm.shotSize,
            createdAt: new Date().toISOString(),
          });
          nextScenes[activeIndex] = {
            ...nextScenes[activeIndex],
            assets: nextAssets,
          };
          setScenesResult(nextScenes);

          setShowAssetForm(false);
          setAssetForm(createEmptyAssetForm());
          setReferenceImage(null);

          try {
            const res = await fetch(`${API_URL}/api/generation/workflow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                projectId,
                taskType: '场景生成',
                step: 'scenes',
                sceneId: scene?.id,
                prompt: fullPrompt,
                referenceAssetIds: referenceImage || referenceAssetIdRef.current ? [referenceAssetIdRef.current] : [],
              }),
            });

            if (!res.ok) throw new Error('场景资产生成失败');

            const data = await res.json();
            const taskId: string = data.taskId;

            pendingScenesRef.current.set(taskId, {
              sceneIndex: activeIndex,
              assetIndex: nextAssets.length - 1,
            });
          } catch (submitError: any) {
            // Rollback: remove placeholder
            const rollback = [...scenesResult];
            rollback[activeIndex].assets?.pop();
            await persistScenes(rollback);
            setError(submitError.message || '场景资产生成失败');
          }
        }}
      />

      {showScriptSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-medium">选择剧本</h3>
              <button
                onClick={() => setShowScriptSelect(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 p-4">
              {scripts.map((script: any, index: number) => (
                <label
                  key={script.id || index}
                  className={`block cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedScriptForAI === index ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="radio"
                    checked={selectedScriptForAI === index}
                    onChange={() => setSelectedScriptForAI(index)}
                    className="mr-2"
                  />
                  <span className="font-medium">{script.title || `剧本 ${index + 1}`}</span>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {script.content || '暂无内容'}
                  </p>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t p-4">
              <button
                onClick={() => setShowScriptSelect(false)}
                className="rounded-lg border px-4 py-2 hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!projectId) return;

                  const script = scripts[selectedScriptForAI];
                  updateStepStatus('scenes', 'generating');
                  setAiGeneratingScenes(true);
                  setShowScriptSelect(false);
                  setError('');

                  try {
                    const token =
                      typeof window === 'undefined'
                        ? null
                        : localStorage.getItem('accessToken');
                    const res = await fetch(`${API_URL}/api/workflow/projects/${projectId}/scenes`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        scriptContent: script?.content || '',
                      }),
                    });

                    if (!res.ok) {
                      throw new Error('场景生成失败');
                    }

                    const scenes = await res.json();
                    const nextScenes = Array.isArray(scenes) ? scenes : [];
                    setAiGeneratedScenes(nextScenes);
                    setSelectedSceneIndices(nextScenes.map((_: any, index: number) => index));
                    setShowScenePreview(true);
                    updateStepStatus('scenes', 'pending');
                  } catch (submitError: any) {
                    updateStepStatus('scenes', 'failed');
                    setError(submitError.message || '场景生成失败');
                  } finally {
                    setAiGeneratingScenes(false);
                  }
                }}
                disabled={aiGeneratingScenes}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {aiGeneratingScenes ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    AI 正在生成场景...
                  </>
                ) : (
                  '开始生成'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScenePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-card shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-medium">选择要保留的场景</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  勾选后确认添加到场景列表。
                </p>
              </div>
              <button onClick={resetPreview} className="rounded-lg p-2 hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {aiGeneratedScenes.map((scene, index) => (
                <label
                  key={scene.id || index}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    selectedSceneIndices.includes(index)
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSceneIndices.includes(index)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedSceneIndices((current) => [...current, index]);
                      } else {
                        setSelectedSceneIndices((current) =>
                          current.filter((item) => item !== index),
                        );
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {scene.name || scene.location || `场景 ${index + 1}`}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {scene.timeOfDay || '白天'}
                      </span>
                    </div>
                    {scene.description && (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {scene.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between border-t p-4">
              <span className="text-sm text-muted-foreground">
                已选择 {selectedSceneIndices.length} / {aiGeneratedScenes.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetPreview}
                  className="rounded-lg border px-4 py-2 hover:bg-muted"
                >
                  全部丢弃
                </button>
                <button
                  onClick={async () => {
                    const selectedScenes = selectedSceneIndices
                      .map((index) => {
                        const scene = aiGeneratedScenes[index];
                        if (!scene) return null;
                        return {
                          id: `scene-${Date.now()}-${index}`,
                          name: scene.name || '',
                          location: scene.location || '',
                          timeOfDay: scene.timeOfDay || '白天',
                          weather: scene.weather || '晴朗',
                          description: scene.description || '',
                          elements: scene.elements || [],
                          assets: [],
                          status: 'pending' as const,
                        };
                      })
                      .filter(Boolean);
                    const nextScenes = [...scenesResult, ...selectedScenes];
                    await persistScenes(nextScenes);
                    updateStepStatus('scenes', 'completed');
                    resetPreview();
                  }}
                  disabled={selectedSceneIndices.length === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  确认添加 ({selectedSceneIndices.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={previewImage}
            alt="预览"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {panoramaImage && (
        <PanoramaViewer
          imageUrl={panoramaImage}
          title={activeScene?.name || '场景全景图'}
          onClose={() => setPanoramaImage(null)}
          onScreenshot={handlePanoramaScreenshot}
        />
      )}
    </div>
  );
}
