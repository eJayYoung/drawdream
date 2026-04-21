'use client';

import { useEffect, useState } from 'react';
import {
  Edit2,
  Film,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { AssetGeneratorModal } from '../asset-generator-modal';
import { ErrorBanner } from '../error-banner';
import { useCreateWorkflowStore } from '../../workflow-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const createEmptyCharacterForm = () => ({
  name: '',
  gender: '男',
  personality: '',
  backstory: '',
  catchphrase: '',
});

const createEmptyAssetForm = () => ({
  type: 'image' as 'image' | 'video',
  prompt: '',
  tags: '',
  angle: '',
  shotSize: '',
});

export function CharactersStep() {
  const {
    projectId,
    error,
    setError,
    steps,
    updateStepStatus,
    scripts,
    selectedScriptIndex,
    charactersResult,
    setCharactersResult,
    saveCharactersToBackend,
  } = useCreateWorkflowStore((state) => ({
    projectId: state.projectId,
    error: state.error,
    setError: state.setError,
    steps: state.steps,
    updateStepStatus: state.updateStepStatus,
    scripts: state.scripts,
    selectedScriptIndex: state.selectedScriptIndex,
    charactersResult: state.charactersResult,
    setCharactersResult: state.setCharactersResult,
    saveCharactersToBackend: state.saveCharactersToBackend,
  }));

  const [selectedCharacterIndex, setSelectedCharacterIndex] = useState<number | null>(null);
  const [showCharacterForm, setShowCharacterForm] = useState(false);
  const [editingCharacterIndex, setEditingCharacterIndex] = useState<number | null>(null);
  const [characterForm, setCharacterForm] = useState(createEmptyCharacterForm());

  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState(createEmptyAssetForm());
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [generatingAsset, setGeneratingAsset] = useState(false);

  const [showScriptSelect, setShowScriptSelect] = useState(false);
  const [selectedScriptForAI, setSelectedScriptForAI] = useState<number>(
    selectedScriptIndex ?? 0,
  );
  const [aiGeneratingCharacters, setAiGeneratingCharacters] = useState(false);
  const [aiGeneratedCharacters, setAiGeneratedCharacters] = useState<any[]>([]);
  const [selectedCharacterIndices, setSelectedCharacterIndices] = useState<number[]>([]);
  const [showCharacterPreview, setShowCharacterPreview] = useState(false);

  const step = steps.find((item) => item.id === 'characters');

  useEffect(() => {
    if (
      selectedCharacterIndex !== null &&
      selectedCharacterIndex >= charactersResult.length
    ) {
      setSelectedCharacterIndex(charactersResult.length > 0 ? 0 : null);
    }
  }, [charactersResult.length, selectedCharacterIndex]);

  const persistCharacters = async (nextCharacters: any[]) => {
    setCharactersResult(nextCharacters);
    await saveCharactersToBackend(nextCharacters);
  };

  const resetPreview = () => {
    setShowCharacterPreview(false);
    setAiGeneratedCharacters([]);
    setSelectedCharacterIndices([]);
  };

  const openCreateForm = () => {
    setEditingCharacterIndex(null);
    setCharacterForm(createEmptyCharacterForm());
    setShowCharacterForm(true);
  };

  const openEditForm = (index: number) => {
    const character = charactersResult[index];
    if (!character) return;
    setEditingCharacterIndex(index);
    setCharacterForm({
      name: character.name || '',
      gender: character.gender || '男',
      personality: character.personality || '',
      backstory: character.backstory || '',
      catchphrase: character.catchphrase || '',
    });
    setShowCharacterForm(true);
  };

  const selectedCharacter =
    selectedCharacterIndex !== null ? charactersResult[selectedCharacterIndex] : null;

  return (
    <div className="space-y-4">
      <ErrorBanner error={error} />

      {step?.status === 'generating' && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span>正在生成角色...</span>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-280px)] gap-4">
        <div className="flex w-2/5 flex-col overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/30 p-3">
            <span className="text-sm font-medium">角色列表 ({charactersResult.length})</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedScriptForAI(selectedScriptIndex ?? 0);
                  setShowScriptSelect(true);
                }}
                disabled={aiGeneratingCharacters || scripts.length === 0}
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
                新建角色
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-auto p-3">
            {charactersResult.length > 0 ? (
              charactersResult.map((character, index) => (
                <button
                  key={character.id || index}
                  onClick={() => setSelectedCharacterIndex(index)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedCharacterIndex === index
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{character.name || `角色 ${index + 1}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {character.gender || '未指定'}
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
                          if (!confirm('确定删除这个角色吗？')) return;
                          const nextCharacters = charactersResult.filter(
                            (_, itemIndex) => itemIndex !== index,
                          );
                          await persistCharacters(nextCharacters);
                        }}
                        className="rounded p-1 hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">
                    {character.personality || '暂无人物特点'}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无角色</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex w-3/5 flex-col overflow-hidden rounded-lg border">
          {selectedCharacter ? (
            <>
              <div className="flex items-center justify-between border-b bg-muted/30 p-3">
                <div>
                  <div className="font-medium">{selectedCharacter.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedCharacter.gender || '未指定'}
                  </div>
                </div>
                <button
                  onClick={() => openEditForm(selectedCharacterIndex!)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  编辑信息
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-auto p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">人物特点：</span>
                    <span>{selectedCharacter.personality || '-'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">口头禅：</span>
                    <span>{selectedCharacter.catchphrase || '-'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">背景：</span>
                    <p className="mt-1 text-muted-foreground">
                      {selectedCharacter.backstory || '-'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium">角色资产</span>
                    <button
                      onClick={() => {
                        setAssetForm(createEmptyAssetForm());
                        setReferenceImage(null);
                        setShowAssetForm(true);
                      }}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
                    >
                      <Plus size={14} />
                      新建资产
                    </button>
                  </div>

                  {(selectedCharacter.assets || []).length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {(selectedCharacter.assets || []).map((asset: any, index: number) => (
                        <div key={asset.id || index} className="overflow-hidden rounded-lg border">
                          <div className="relative aspect-square bg-muted">
                            {asset.type === 'image' ? (
                              <img
                                src={asset.url}
                                alt={asset.prompt}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Film size={24} className="text-muted-foreground" />
                              </div>
                            )}
                            <button
                              onClick={async () => {
                                const nextCharacters = [...charactersResult];
                                nextCharacters[selectedCharacterIndex!].assets = (
                                  nextCharacters[selectedCharacterIndex!].assets || []
                                ).filter((_: any, assetIndex: number) => assetIndex !== index);
                                await persistCharacters(nextCharacters);
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
                      暂无角色资产
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p>选择一个角色查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCharacterForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-medium">
                {editingCharacterIndex !== null ? '编辑角色' : '新建角色'}
              </h3>
              <button
                onClick={() => setShowCharacterForm(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">名称</label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(event) =>
                      setCharacterForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">性别</label>
                  <select
                    value={characterForm.gender}
                    onChange={(event) =>
                      setCharacterForm((current) => ({
                        ...current,
                        gender: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">人物特点</label>
                <input
                  type="text"
                  value={characterForm.personality}
                  onChange={(event) =>
                    setCharacterForm((current) => ({
                      ...current,
                      personality: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">背景故事</label>
                <textarea
                  value={characterForm.backstory}
                  onChange={(event) =>
                    setCharacterForm((current) => ({
                      ...current,
                      backstory: event.target.value,
                    }))
                  }
                  className="min-h-[100px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">口头禅</label>
                <input
                  type="text"
                  value={characterForm.catchphrase}
                  onChange={(event) =>
                    setCharacterForm((current) => ({
                      ...current,
                      catchphrase: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-4">
              <button
                onClick={() => setShowCharacterForm(false)}
                className="rounded-lg border px-4 py-2 hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  if (!characterForm.name.trim()) {
                    setError('请先输入角色名称');
                    return;
                  }

                  const nextCharacters = [...charactersResult];
                  const nextCharacter = {
                    id:
                      editingCharacterIndex !== null
                        ? nextCharacters[editingCharacterIndex]?.id
                        : `char-${Date.now()}`,
                    ...characterForm,
                    assets:
                      editingCharacterIndex !== null
                        ? nextCharacters[editingCharacterIndex]?.assets || []
                        : [],
                    createdAt:
                      editingCharacterIndex !== null
                        ? nextCharacters[editingCharacterIndex]?.createdAt
                        : new Date().toISOString(),
                  };

                  if (editingCharacterIndex !== null) {
                    nextCharacters[editingCharacterIndex] = nextCharacter;
                  } else {
                    nextCharacters.push(nextCharacter);
                    setSelectedCharacterIndex(nextCharacters.length - 1);
                  }

                  await persistCharacters(nextCharacters);
                  setShowCharacterForm(false);
                  setCharacterForm(createEmptyCharacterForm());
                }}
                className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              >
                {editingCharacterIndex !== null ? '保存修改' : '创建角色'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AssetGeneratorModal
        open={showAssetForm}
        title="新建角色资产"
        assetForm={assetForm}
        setAssetForm={setAssetForm}
        referenceImage={referenceImage}
        setReferenceImage={setReferenceImage}
        generatingAsset={generatingAsset}
        onClose={() => {
          setShowAssetForm(false);
          setAssetForm(createEmptyAssetForm());
          setReferenceImage(null);
        }}
        onSubmit={async () => {
          if (!assetForm.prompt.trim()) {
            setError('请先输入资产提示词');
            return;
          }
          if (selectedCharacterIndex === null || !projectId) return;

          setGeneratingAsset(true);
          setError('');

          try {
            const token =
              typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
            const promptParts = [assetForm.shotSize, assetForm.angle, assetForm.prompt].filter(
              Boolean,
            );
            const fullPrompt = promptParts.join(', ');
            const res = await fetch(`${API_URL}/api/generation/image`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                prompt: fullPrompt,
                referenceImage,
                projectId,
              }),
            });

            if (!res.ok) {
              throw new Error('角色资产生成失败');
            }

            const data = await res.json();
            const nextCharacters = [...charactersResult];
            const nextAssets = nextCharacters[selectedCharacterIndex].assets || [];
            nextAssets.push({
              id: `asset-${Date.now()}`,
              type: assetForm.type,
              url: data.imageUrl || data.url || '/placeholder.png',
              prompt: fullPrompt,
              tags: [],
              angle: assetForm.angle,
              shotSize: assetForm.shotSize,
              createdAt: new Date().toISOString(),
            });
            nextCharacters[selectedCharacterIndex] = {
              ...nextCharacters[selectedCharacterIndex],
              assets: nextAssets,
            };

            await persistCharacters(nextCharacters);
            setShowAssetForm(false);
            setAssetForm(createEmptyAssetForm());
            setReferenceImage(null);
          } catch (submitError: any) {
            setError(submitError.message || '角色资产生成失败');
          } finally {
            setGeneratingAsset(false);
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
                  updateStepStatus('characters', 'generating');
                  setAiGeneratingCharacters(true);
                  setShowScriptSelect(false);
                  setError('');

                  try {
                    const token =
                      typeof window === 'undefined'
                        ? null
                        : localStorage.getItem('accessToken');
                    const res = await fetch(
                      `${API_URL}/api/workflow/projects/${projectId}/characters`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          scriptContent: script?.content || '',
                        }),
                      },
                    );

                    if (!res.ok) {
                      throw new Error('角色生成失败');
                    }

                    const characters = await res.json();
                    const nextCharacters = Array.isArray(characters) ? characters : [];
                    setAiGeneratedCharacters(nextCharacters);
                    setSelectedCharacterIndices(nextCharacters.map((_: any, index: number) => index));
                    setShowCharacterPreview(true);
                    updateStepStatus('characters', 'pending');
                  } catch (submitError: any) {
                    updateStepStatus('characters', 'failed');
                    setError(submitError.message || '角色生成失败');
                  } finally {
                    setAiGeneratingCharacters(false);
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

      {showCharacterPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-card shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="text-lg font-medium">选择要保留的角色</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  勾选后确认添加到角色列表。
                </p>
              </div>
              <button
                onClick={resetPreview}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-auto p-4">
              {aiGeneratedCharacters.map((character, index) => (
                <label
                  key={character.id || index}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                    selectedCharacterIndices.includes(index)
                      ? 'border-primary bg-primary/5'
                      : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCharacterIndices.includes(index)}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setSelectedCharacterIndices((current) => [...current, index]);
                      } else {
                        setSelectedCharacterIndices((current) =>
                          current.filter((item) => item !== index),
                        );
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {character.name || `角色 ${index + 1}`}
                      </span>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs">
                        {character.gender || '未指定'}
                      </span>
                    </div>
                    {character.personality && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {character.personality}
                      </div>
                    )}
                    {character.backstory && (
                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {character.backstory}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between border-t p-4">
              <span className="text-sm text-muted-foreground">
                已选择 {selectedCharacterIndices.length} / {aiGeneratedCharacters.length}
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
                    const selectedCharacters = selectedCharacterIndices
                      .map((index) => aiGeneratedCharacters[index])
                      .filter(Boolean);
                    const nextCharacters = [...charactersResult, ...selectedCharacters];
                    await persistCharacters(nextCharacters);
                    updateStepStatus('characters', 'completed');
                    resetPreview();
                  }}
                  disabled={selectedCharacterIndices.length === 0}
                  className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  确认添加 ({selectedCharacterIndices.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

