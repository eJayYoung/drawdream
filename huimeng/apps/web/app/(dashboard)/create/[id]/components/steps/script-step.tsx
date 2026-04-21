'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { ErrorBanner } from '../error-banner';
import { useCreateWorkflowStore } from '../../workflow-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function ScriptStep() {
  const {
    projectId,
    error,
    setError,
    scripts,
    selectedScriptIndex,
    setScripts,
    setSelectedScriptIndex,
    selectScript,
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
    selectScript: state.selectScript,
    scriptContent: state.scriptContent,
    setScriptContent: state.setScriptContent,
    setScriptResult: state.setScriptResult,
    saveScriptsToBackend: state.saveScriptsToBackend,
  }));

  const [editingScriptIndex, setEditingScriptIndex] = useState<number | null>(null);
  const [editingScriptTitle, setEditingScriptTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const startEditing = (index: number) => {
    setEditingScriptIndex(index);
    setEditingScriptTitle(scripts[index]?.title || '');
    setScriptContent(scripts[index]?.content || '');
  };

  const saveEditing = async () => {
    if (editingScriptIndex === null) return;

    const nextScripts = [...scripts];
    nextScripts[editingScriptIndex] = {
      ...nextScripts[editingScriptIndex],
      title: editingScriptTitle || `剧本 ${editingScriptIndex + 1}`,
      content: scriptContent,
    };

    let nextSelectedIndex = selectedScriptIndex;
    if (nextSelectedIndex === null) {
      nextSelectedIndex = editingScriptIndex;
    }

    setScripts(nextScripts);
    setSelectedScriptIndex(nextSelectedIndex);
    setEditingScriptIndex(null);
    setAiPrompt('');
    setAiResult('');

    if (nextSelectedIndex !== null) {
      setScriptResult({
        content: nextScripts[nextSelectedIndex]?.content || '',
      });
    }

    await saveScriptsToBackend(nextScripts, nextSelectedIndex);
  };

  return (
    <div className="flex h-full flex-col">
      <ErrorBanner error={error} />

      {editingScriptIndex === null ? (
        <>
          <div className="mb-4 mt-4 flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">共 {scripts.length} 个剧本</span>
              {selectedScriptIndex !== null && (
                <span className="ml-2 text-xs text-primary">
                  默认: {scripts[selectedScriptIndex]?.title}
                </span>
              )}
            </div>
            <button
              onClick={async () => {
                const newScript = {
                  id: `script-${Date.now()}`,
                  title: `剧本 ${scripts.length + 1}`,
                  content: '',
                  createdAt: new Date().toISOString(),
                };
                const nextScripts = [...scripts, newScript];
                setScripts(nextScripts);
                setEditingScriptIndex(scripts.length);
                setEditingScriptTitle(newScript.title);
                setScriptContent('');
                await saveScriptsToBackend(nextScripts, selectedScriptIndex);
              }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
            >
              <Plus size={16} />
              新增剧本
            </button>
          </div>

          {scripts.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>暂无剧本</p>
                <p className="mt-2 text-sm">点击“新增剧本”开始创作</p>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">
                单击选择默认剧本，双击进入编辑。
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {scripts.map((script, index) => (
                  <div
                    key={script.id || index}
                    onClick={async () => {
                      selectScript(index);
                      await saveScriptsToBackend(scripts, index);
                    }}
                    onDoubleClick={() => startEditing(index)}
                    className={`cursor-pointer rounded-xl border bg-card p-4 transition-all hover:shadow-lg ${
                      selectedScriptIndex === index
                        ? 'border-primary ring-2 ring-primary/30'
                        : 'hover:border-primary/40'
                    }`}
                  >
                    {selectedScriptIndex === index && (
                      <div className="mb-2 text-xs font-medium text-primary">默认剧本</div>
                    )}

                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {selectedScriptIndex === index && (
                          <CheckCircle2 size={16} className="text-primary" />
                        )}
                        <FileText size={20} className="text-primary" />
                      </div>
                      <button
                        onClick={async (event) => {
                          event.stopPropagation();
                          if (!confirm('确定删除这个剧本吗？')) return;

                          const nextScripts = scripts.filter((_, itemIndex) => itemIndex !== index);
                          let nextSelectedIndex = selectedScriptIndex;

                          if (selectedScriptIndex === index) {
                            nextSelectedIndex = null;
                          } else if (
                            selectedScriptIndex !== null &&
                            selectedScriptIndex > index
                          ) {
                            nextSelectedIndex = selectedScriptIndex - 1;
                          }

                          setScripts(nextScripts);
                          setSelectedScriptIndex(nextSelectedIndex);

                          if (nextSelectedIndex !== null) {
                            setScriptResult({
                              content: nextScripts[nextSelectedIndex]?.content || '',
                            });
                          }

                          await saveScriptsToBackend(nextScripts, nextSelectedIndex);
                        }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <h3 className="mb-1 truncate font-medium">{script.title}</h3>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {script.content ? `${script.content.slice(0, 100)}...` : '双击编辑剧本内容'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {script.createdAt ? new Date(script.createdAt).toLocaleDateString() : ''}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="mt-4 flex h-full gap-4">
          <div className="flex flex-[3] flex-col">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={saveEditing}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft size={16} />
                返回列表并保存
              </button>
            </div>

            <div className="mb-3">
              <input
                type="text"
                value={editingScriptTitle}
                onChange={(event) => setEditingScriptTitle(event.target.value)}
                placeholder="剧本名称"
                className="w-full rounded-lg border px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <textarea
              value={scriptContent}
              onChange={(event) => setScriptContent(event.target.value)}
              placeholder="在这里编写你的剧本..."
              className="flex-1 resize-none rounded-lg border p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-[2] flex-col border-l pl-4">
            <div className="mb-2 text-sm font-medium">AI 助手</div>
            <textarea
              value={aiPrompt}
              onChange={(event) => setAiPrompt(event.target.value)}
              placeholder="描述你希望 AI 帮你补写或润色的内容..."
              className="h-32 w-full resize-none rounded-lg border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={async () => {
                if (!aiPrompt.trim() || !projectId) return;

                setAiGenerating(true);
                setAiResult('');
                setError('');

                try {
                  const token =
                    typeof window === 'undefined'
                      ? null
                      : localStorage.getItem('accessToken');
                  const res = await fetch(`${API_URL}/api/workflow/projects/${projectId}/script`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      prompt: aiPrompt,
                      existingContent: scriptContent,
                    }),
                  });

                  const data = await res.json();
                  setAiResult(data.content || data.scriptContent || JSON.stringify(data, null, 2));
                } catch {
                  setAiResult('生成失败，请重试');
                } finally {
                  setAiGenerating(false);
                }
              }}
              disabled={aiGenerating}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成
                </>
              )}
            </button>

            {aiResult && (
              <>
                <p className="mb-2 mt-4 text-xs text-muted-foreground">
                  可以直接覆盖左侧内容，或者复制有用片段手动整理。
                </p>
                <div className="mb-2 flex gap-2">
                  <button
                    onClick={() => setScriptContent(aiResult)}
                    className="flex-1 rounded bg-primary/10 px-3 py-1.5 text-sm text-primary hover:bg-primary/20"
                  >
                    覆盖左侧
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiResult)}
                    className="flex-1 rounded border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    复制结果
                  </button>
                </div>
                <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 p-3">
                  <pre className="whitespace-pre-wrap text-sm">{aiResult}</pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

