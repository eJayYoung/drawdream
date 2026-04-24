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
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import { AssetGeneratorModal } from '../asset-generator-modal';
import { ErrorBanner } from '../error-banner';
import { useCreateWorkflowStore } from '../../workflow-store';
import { useSocketIO, type GenerationProgressPayload } from '../../../../../../lib/use-socket-io';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createEmptySceneForm = () => ({
  name: '',
  location: '',
  timeOfDay: '白天',
  description: '',
  imageUrl: '',
});

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

  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [showSceneForm, setShowSceneForm] = useState(false);
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [sceneForm, setSceneForm] = useState(createEmptySceneForm());

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

  // Pending asset taskId → { sceneIndex, assetIndex } mapping
  const pendingScenesRef = useRef<Map<string, { sceneIndex: number; assetIndex: number }>>(new Map());

  // --- WebSocket for real-time asset updates ---
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

      if (data.status === 'completed' && data.outputResult?.assets) {
        const assets = data.outputResult.assets as string[];
        const nextScenes = [...scenesResult];
        const scene = nextScenes[mapping.sceneIndex];
        if (scene?.assets?.[mapping.assetIndex]) {
          scene.assets[mapping.assetIndex] = {
            ...scene.assets[mapping.assetIndex],
            url: assets[0] || '/placeholder.png',
          };
          void persistScenes(nextScenes);
        }
        pending.delete(data.taskId);
      } else if (data.status === 'failed') {
        const nextScenes = [...scenesResult];
        nextScenes[mapping.sceneIndex].assets?.splice(mapping.assetIndex, 1);
        void persistScenes(nextScenes);
        pending.delete(data.taskId);
        setError(data.error || '资产生成失败');
      }
    },
  });

  const step = steps.find((item) => item.id === 'scenes');

  useEffect(() => {
    if (selectedSceneIndex !== null && selectedSceneIndex >= scenesResult.length) {
      setSelectedSceneIndex(scenesResult.length > 0 ? 0 : null);
    }
  }, [scenesResult.length, selectedSceneIndex]);

  const persistScenes = async (nextScenes: any[]) => {
    setScenesResult(nextScenes);
    await saveScenesToBackend(nextScenes);
  };

  const resetPreview = () => {
    setShowScenePreview(false);
    setAiGeneratedScenes([]);
    setSelectedSceneIndices([]);
  };

  const openCreateForm = () => {
    setEditingSceneIndex(null);
    setSceneForm(createEmptySceneForm());
    setShowSceneForm(true);
  };

  const openEditForm = (index: number) => {
    const scene = scenesResult[index];
    if (!scene) return;
    setEditingSceneIndex(index);
    setSceneForm({
      name: scene.name || '',
      location: scene.location || '',
      timeOfDay: scene.timeOfDay || '白天',
      description: scene.description || '',
      imageUrl: scene.imageUrl || '',
    });
    setShowSceneForm(true);
  };

  const selectedScene =
    selectedSceneIndex !== null ? scenesResult[selectedSceneIndex] : null;

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />

      {step?.status === 'generating' && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span>正在生成场景...</span>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-280px)] gap-4">
        <div className="flex w-2/5 flex-col overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/30 p-3">
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
                onClick={openCreateForm}
                className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
              >
                <Plus size={14} />
                新建场景
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-3">
            {scenesResult.length > 0 ? (
              scenesResult.map((scene, index) => (
                <button
                  key={scene.id || index}
                  onClick={() => setSelectedSceneIndex(index)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedSceneIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {scene.name || scene.location || `场景 ${index + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {scene.location || '-'} · {scene.timeOfDay || '白天'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditForm(index);
                        }}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!confirm('确定删除这个场景吗？')) return;
                          const nextScenes = scenesResult.filter(
                            (_, itemIndex) => itemIndex !== index,
                          );
                          await persistScenes(nextScenes);
                        }}
                        className="rounded p-1 hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {scene.description || '暂无场景描述'}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无场景</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-3/5 flex-col overflow-hidden rounded-lg border">
          {selectedScene ? (
            <>
              <div className="flex items-center justify-between border-b bg-muted/30 p-3">
                <div>
                  <div className="font-medium">
                    {selectedScene.name || selectedScene.location || '未命名场景'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedScene.location || '-'} · {selectedScene.timeOfDay || '白天'}
                  </div>
                </div>
                <button
                  onClick={() => openEditForm(selectedSceneIndex!)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  编辑场景
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-auto p-4">
                {selectedScene.imageUrl && (
                  <img
                    src={selectedScene.imageUrl}
                    alt={selectedScene.name || 'scene'}
                    className="h-48 w-full rounded-lg object-cover"
                  />
                )}

                <div className="text-sm">
                  <span className="text-muted-foreground">环境描述：</span>
                  <p className="mt-1 text-muted-foreground">
                    {selectedScene.description || '-'}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">场景资产</span>
                    <button
                      onClick={() => {
                        setAssetForm({
                          ...createEmptyAssetForm(),
                          prompt: `${selectedScene.location || ''} ${
                            selectedScene.timeOfDay || ''
                          } ${selectedScene.description || ''}`.trim(),
                        });
                        setReferenceImage(selectedScene.imageUrl || null);
                        setShowAssetForm(true);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                    >
                      <Plus size={14} />
                      新建资产
                    </button>
                  </div>

                  {(selectedScene.assets || []).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {(selectedScene.assets || []).map((asset: any, index: number) => (
                        <div key={asset.id || index} className="overflow-hidden rounded-lg border">
                          <div className="relative aspect-square bg-muted">
                            {asset.type === 'image' ? (
                              asset.url && asset.url !== '/placeholder.png' ? (
                                <div
                                  className="group relative h-full cursor-pointer"
                                  onClick={() => setPreviewImage(asset.url)}
                                >
                                  <img
                                    src={asset.url}
                                    alt={asset.prompt}
                                    className="h-full w-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
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
                                nextScenes[selectedSceneIndex!].assets = (
                                  nextScenes[selectedSceneIndex!].assets || []
                                ).filter((_: any, assetIndex: number) => assetIndex !== index);
                                await persistScenes(nextScenes);
                              }}
                              className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white"
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
                    <div className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
                      暂无场景资产
                    </div>
                  )}
                </div>
              </div>
            </>
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

      {showSceneForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-medium">
                {editingSceneIndex !== null ? '编辑场景' : '新建场景'}
              </h3>
              <button
                onClick={() => setShowSceneForm(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium">场景名称</label>
                <input
                  type="text"
                  value={sceneForm.name}
                  onChange={(event) =>
                    setSceneForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">地点</label>
                  <input
                    type="text"
                    value={sceneForm.location}
                    onChange={(event) =>
                      setSceneForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">时间</label>
                  <select
                    value={sceneForm.timeOfDay}
                    onChange={(event) =>
                      setSceneForm((current) => ({
                        ...current,
                        timeOfDay: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="清晨">清晨</option>
                    <option value="白天">白天</option>
                    <option value="黄昏">黄昏</option>
                    <option value="夜晚">夜晚</option>
                    <option value="深夜">深夜</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">环境描述</label>
                <textarea
                  value={sceneForm.description}
                  onChange={(event) =>
                    setSceneForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="min-h-[100px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">场景图片</label>
                {sceneForm.imageUrl ? (
                  <div className="relative">
                    <img
                      src={sceneForm.imageUrl}
                      alt="scene"
                      className="h-32 w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() =>
                        setSceneForm((current) => ({ ...current, imageUrl: '' }))
                      }
                      className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted/40">
                    <Upload size={22} className="mb-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">点击上传场景图</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (loadEvent) =>
                          setSceneForm((current) => ({
                            ...current,
                            imageUrl: loadEvent.target?.result as string,
                          }));
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-4">
              <button
                onClick={() => setShowSceneForm(false)}
                className="rounded-lg border px-4 py-2 hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  const nextScenes = [...scenesResult];
                  const nextScene = {
                    id:
                      editingSceneIndex !== null
                        ? nextScenes[editingSceneIndex]?.id
                        : `scene-${Date.now()}`,
                    ...sceneForm,
                    name:
                      sceneForm.name ||
                      sceneForm.location ||
                      `场景 ${scenesResult.length + 1}`,
                    assets:
                      editingSceneIndex !== null
                        ? nextScenes[editingSceneIndex]?.assets || []
                        : [],
                    createdAt:
                      editingSceneIndex !== null
                        ? nextScenes[editingSceneIndex]?.createdAt
                        : new Date().toISOString(),
                  };

                  if (editingSceneIndex !== null) {
                    nextScenes[editingSceneIndex] = nextScene;
                  } else {
                    nextScenes.push(nextScene);
                    setSelectedSceneIndex(nextScenes.length - 1);
                  }

                  await persistScenes(nextScenes);
                  setShowSceneForm(false);
                  setSceneForm(createEmptySceneForm());
                }}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              >
                {editingSceneIndex !== null ? '保存修改' : '创建场景'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        onClose={() => {
          setShowAssetForm(false);
          setAssetForm(createEmptyAssetForm());
          setReferenceImage(null);
          referenceAssetIdRef.current = undefined;
          referenceAssetContentRef.current = undefined;
        }}
        onSubmit={async () => {
          if (selectedSceneIndex === null || !projectId) return;

          setError('');

          const token =
            typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
          const promptParts = [assetForm.shotSize, assetForm.angle, assetForm.prompt].filter(
            Boolean,
          );
          const fullPrompt = promptParts.join(', ');

          // 1. Add pending asset with placeholder — don't block on generation
          const nextScenes = [...scenesResult];
          const nextAssets = nextScenes[selectedSceneIndex].assets || [];
          const newAssetIndex = nextAssets.length;
          nextAssets.push({
            id: `asset-${Date.now()}`,
            type: assetForm.type,
            url: '/placeholder.png',
            prompt: fullPrompt,
            tags: [],
            angle: assetForm.angle,
            shotSize: assetForm.shotSize,
            createdAt: new Date().toISOString(),
          });
          nextScenes[selectedSceneIndex] = {
            ...nextScenes[selectedSceneIndex],
            assets: nextAssets,
          };
          await persistScenes(nextScenes);

          // 2. Close modal immediately
          setShowAssetForm(false);
          setAssetForm(createEmptyAssetForm());
          setReferenceImage(null);

          // 3. Submit generation task
          try {
            const res = await fetch(`${API_URL}/api/generation/workflow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                projectId,
                taskType: referenceImage || referenceAssetIdRef.current ? 'createScenePicture-i2i' : 'createScenePicture-t2i',
                prompt: fullPrompt,
                referenceAssetId: referenceAssetIdRef.current,
                inParam: JSON.stringify({
                  prompt: fullPrompt,
                  image: referenceAssetContentRef.current,
                }),
              }),
            });

            if (!res.ok) throw new Error('场景资产生成失败');

            const data = await res.json();
            const taskId: string = data.taskId;

            // 4. Register pending mapping so WebSocket can update the right asset
            pendingScenesRef.current.set(taskId, {
              sceneIndex: selectedSceneIndex,
              assetIndex: newAssetIndex,
            });
          } catch (submitError: any) {
            // Rollback: remove the placeholder asset on failure
            const rollback = [...scenesResult];
            rollback[selectedSceneIndex].assets?.pop();
            await persistScenes(rollback);
            setError(submitError.message || '场景资产生成失败');
          }
        }}
      />

      {showScriptSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card shadow-xl">
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
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              >
                开始生成
              </button>
            </div>
          </div>
        </div>
      )}

      {showScenePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-card shadow-xl">
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
                      .map((index) => aiGeneratedScenes[index])
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
    {/* 图片预览弹窗 */}
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
    </div>
  );
}
