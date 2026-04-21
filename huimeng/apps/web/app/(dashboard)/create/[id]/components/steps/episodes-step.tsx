'use client';

import { Layers, Loader2, Sparkles } from 'lucide-react';
import { ErrorBanner } from '../error-banner';
import { useCreateWorkflowStore } from '../../workflow-store';

export function EpisodesStep() {
  const { error, episodesResult, steps, generateEpisodes } = useCreateWorkflowStore((state) => ({
    error: state.error,
    episodesResult: state.episodesResult,
    steps: state.steps,
    generateEpisodes: state.generateEpisodes,
  }));

  const step = steps.find((item) => item.id === 'episodes');

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {episodesResult.length > 0 ? `已生成 ${episodesResult.length} 集` : '从剧本生成剧集结构'}
        </div>
        <button
          onClick={() => void generateEpisodes()}
          disabled={step?.status === 'generating'}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {step?.status === 'generating' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              AI 智能分集
            </>
          )}
        </button>
      </div>

      <ErrorBanner error={error} />

      {step?.status === 'generating' ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border bg-muted/40">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span>正在调用 AI 进行分集...</span>
          </div>
        </div>
      ) : episodesResult.length > 0 ? (
        <div className="flex-1 overflow-auto rounded-lg border bg-muted/30 p-4">
          <div className="space-y-4">
            {episodesResult.map((episode: any, index: number) => (
              <div key={episode.id || index} className="rounded-lg border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {episode.episodeNumber || episode.number || index + 1}
                  </span>
                  <span className="font-medium">
                    {episode.title || `第 ${episode.episodeNumber || episode.number || index + 1} 集`}
                  </span>
                </div>

                {episode.summary && (
                  <p className="mb-3 text-sm text-muted-foreground">{episode.summary}</p>
                )}

                {episode.scriptContent && (
                  <pre className="overflow-auto rounded bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                    {typeof episode.scriptContent === 'string'
                      ? episode.scriptContent
                      : JSON.stringify(episode.scriptContent, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Layers size={48} className="mx-auto mb-4 opacity-50" />
            <p>点击“AI 智能分集”开始生成</p>
          </div>
        </div>
      )}
    </div>
  );
}

