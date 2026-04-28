'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Wand2,
  ArrowLeftRight,
  X,
} from 'lucide-react';
import { ErrorBanner } from '../error-banner';
import { useCreateWorkflowStore } from '../../workflow-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ModalType = 'convert' | 'expand' | null;

export function ScriptStep() {
  const {
    projectId,
    error,
    setError,
    scripts,
    selectedScriptIndex,
    setScripts,
    setSelectedScriptIndex,
    scriptContent,
    setScriptContent,
    setScriptResult,
    saveScriptsToBackend,
  } = useCreateWorkflowStore((state) => ({
    projectId: state.projectId,
    error: state.error,
    setError: state.setError,
    scripts: state.scripts,
    selectedScriptIndex: state.selectedScriptIndex,
    setScripts: state.setScripts,
    setSelectedScriptIndex: state.setSelectedScriptIndex,
    scriptContent: state.scriptContent,
    setScriptContent: state.setScriptContent,
    setScriptResult: state.setScriptResult,
    saveScriptsToBackend: state.saveScriptsToBackend,
  }));

  const [selectedScriptIndexInternal, setSelectedScriptIndexInternal] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);

  const activeIndex = selectedScriptIndexInternal !== null ? selectedScriptIndexInternal : selectedScriptIndex;
  const activeScript = activeIndex !== null ? scripts[activeIndex] : null;

  const handleConvertFormat = async () => {
    if (!activeScript?.content || !projectId || activeIndex === null) return;

    setConverting(true);
    setError('');

    try {
      const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/workflow/projects/${projectId}/script/format`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: activeScript.content }),
      });

      if (!res.ok) throw new Error('转换格式失败');

      const data = await res.json();
      const formattedContent = data.content || data.formattedContent || data.result;

      const nextScripts = [...scripts];
      nextScripts[activeIndex] = { ...nextScripts[activeIndex], content: formattedContent };
      setScripts(nextScripts);
      setScriptContent(formattedContent);
      setScriptResult({ content: formattedContent });

      await saveScriptsToBackend(nextScripts, activeIndex);
      setModalType(null);
    } catch (err: any) {
      setError(err.message || '转换格式失败');
    } finally {
      setConverting(false);
    }
  };

  const handleAiExpand = async () => {
    if (!activeScript?.content || !aiPrompt.trim() || !projectId || activeIndex === null) return;

    setAiGenerating(true);
    setAiResult('');
    setError('');

    try {
      const token = typeof window === 'undefined' ? null : localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/workflow/projects/${projectId}/script/expand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: activeScript.content,
          prompt: aiPrompt,
        }),
      });

      if (!res.ok) throw new Error('AI扩写失败');

      const data = await res.json();
      const expandedContent = data.content || data.expandedContent || data.result;
      setAiResult(expandedContent);
    } catch (err: any) {
      setAiResult('扩写失败，请重试');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiResult = async () => {
    if (!aiResult || activeIndex === null) return;

    const nextScripts = [...scripts];
    nextScripts[activeIndex] = { ...nextScripts[activeIndex], content: aiResult };
    setScripts(nextScripts);
    setScriptContent(aiResult);
    setScriptResult({ content: aiResult });
    setAiResult('');
    setAiPrompt('');
    setModalType(null);
    await saveScriptsToBackend(nextScripts, activeIndex);
  };

  const handleSaveScript = async () => {
    if (activeIndex === null) return;
    const nextScripts = [...scripts];
    nextScripts[activeIndex] = { ...nextScripts[activeIndex], content: scriptContent };
    setScripts(nextScripts);
    setScriptResult({ content: scriptContent });
    await saveScriptsToBackend(nextScripts, activeIndex);
  };

  const handleDeleteScript = async (index: number) => {
    if (!confirm('确定删除这个剧本吗？')) return;

    const nextScripts = scripts.filter((_, i) => i !== index);
    let nextSelectedIndex = selectedScriptIndex;

    if (selectedScriptIndex === index) {
      nextSelectedIndex = null;
    } else if (selectedScriptIndex !== null && selectedScriptIndex > index) {
      nextSelectedIndex = selectedScriptIndex - 1;
    }

    setScripts(nextScripts);
    setSelectedScriptIndex(nextSelectedIndex);
    if (selectedScriptIndexInternal === index) {
      setSelectedScriptIndexInternal(null);
    }

    if (nextSelectedIndex !== null) {
      setScriptResult({ content: nextScripts[nextSelectedIndex]?.content || '' });
    }

    await saveScriptsToBackend(nextScripts, nextSelectedIndex);
  };

  const handleAddScript = async () => {
    const newScript = {
      id: crypto.randomUUID(),
      isNew: true,
      title: `剧本 ${scripts.length + 1}`,
      content: '',
      createdAt: new Date().toISOString(),
    };
    const newIndex = scripts.length;
    const nextScripts = [...scripts, newScript];
    setScripts(nextScripts);
    setSelectedScriptIndexInternal(newIndex);
    setSelectedScriptIndex(newIndex);
    setScriptContent('');
    await saveScriptsToBackend(nextScripts, newIndex);
  };

  const handleSelectScript = (index: number) => {
    setSelectedScriptIndexInternal(index);
    setSelectedScriptIndex(index);
    const script = scripts[index];
    if (script) {
      setScriptContent(script.content || '');
    }
  };

  const openModal = (type: ModalType) => {
    if (!activeScript) return;
    setModalType(type);
    setAiPrompt('');
    setAiResult('');
  };

  const closeModal = () => {
    setModalType(null);
    setAiPrompt('');
    setAiResult('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ErrorBanner error={error} />

      <div className="mb-4 flex items-center justify-between shrink-0">
        <div>
          <span className="text-sm text-muted-foreground">共 {scripts.length} 个剧本</span>
          {activeIndex !== null && (
            <span className="ml-2 text-xs text-primary">
              当前: {scripts[activeIndex]?.title}
            </span>
          )}
        </div>
        <button
          onClick={handleAddScript}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} />
          新增剧本
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Script List */}
        <div className="flex w-[356px] flex-col border-r pr-4">
          {scripts.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">暂无剧本</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto">
              {scripts.map((script, index) => (
                <div
                  key={script.id || index}
                  onClick={() => handleSelectScript(index)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    activeIndex === index
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      : 'hover:border-primary/40'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {activeIndex === index && (
                        <CheckCircle2 size={14} className="text-primary" />
                      )}
                      <FileText size={16} className="text-primary" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteScript(index);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h3 className="truncate text-sm font-medium">{script.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {script.content ? `${script.content.slice(0, 60)}...` : '空剧本'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Script Editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeScript ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Action Buttons */}
              <div className="mb-4 flex items-center gap-2 border-b pb-4 shrink-0">
                <button
                  onClick={() => activeScript.content && openModal('convert')}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <ArrowLeftRight size={14} />
                  转标准剧本格式
                </button>
                <button
                  onClick={() => activeScript.content && openModal('expand')}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <Wand2 size={14} />
                  AI扩写
                </button>
                <button
                  onClick={handleSaveScript}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                >
                  保存剧本
                </button>
              </div>

              {/* Script Title */}
              <div className="mb-3">
                <input
                  type="text"
                  value={activeScript.title || ''}
                  onChange={(e) => {
                    if (activeIndex === null) return;
                    const nextScripts = [...scripts];
                    nextScripts[activeIndex] = { ...nextScripts[activeIndex], title: e.target.value };
                    setScripts(nextScripts);
                  }}
                  placeholder="剧本名称"
                  className="w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Script Content Editor */}
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="在这里编写你的剧本..."
                className="min-h-0 flex-1 resize-none rounded-lg border p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>选择或创建一个剧本开始编辑</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {modalType === 'convert' ? '转标准剧本格式' : 'AI扩写'}
              </h2>
              <button
                onClick={closeModal}
                className="rounded p-1 hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            {modalType === 'convert' && (
              <div>
                <p className="mb-4 text-sm text-muted-foreground">
                  将剧本内容转换为标准剧本格式，包括场景描述、人物对话等结构化元素。
                </p>
                <button
                  onClick={handleConvertFormat}
                  disabled={converting}
                  className="w-full rounded-lg bg-primary py-3 text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed"
                >
                  {converting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      转换中...
                    </span>
                  ) : (
                    '开始转换'
                  )}
                </button>
              </div>
            )}

            {modalType === 'expand' && !aiResult && (
              <div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="描述你希望 AI 帮你扩写的内容..."
                  className="mb-4 h-32 w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleAiExpand}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full rounded-lg bg-primary py-3 text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed"
                >
                  {aiGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      生成中...
                    </span>
                  ) : (
                    '开始扩写'
                  )}
                </button>
              </div>
            )}

            {modalType === 'expand' && aiResult && (
              <div>
                <p className="mb-2 text-xs text-muted-foreground">扩写结果：</p>
                <div className="mb-4 max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3">
                  <pre className="whitespace-pre-wrap text-sm">{aiResult}</pre>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleApplyAiResult}
                    className="flex-1 rounded bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
                  >
                    应用到剧本
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiResult)}
                    className="flex-1 rounded border px-3 py-2 text-sm hover:bg-muted"
                  >
                    复制
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 rounded border px-3 py-2 text-sm hover:bg-muted"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}