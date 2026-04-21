'use client';

import { Film } from 'lucide-react';

export function ScriptDisplay({ data }: { data: any }) {
  let script: any;

  try {
    script = typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return <pre className="text-sm whitespace-pre-wrap">{data}</pre>;
  }

  if (!script?.title && !script?.episodes) {
    return <pre className="text-sm whitespace-pre-wrap">{data}</pre>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Film size={18} className="text-primary" />
          <h3 className="text-lg font-semibold">{script.title || '未命名剧本'}</h3>
        </div>
        {script.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">{script.summary}</p>
        )}
      </div>

      {script.episodes?.map((episode: any, episodeIndex: number) => (
        <div key={episodeIndex} className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {episode.number || episodeIndex + 1}
              </span>
              <h4 className="font-medium">
                {episode.title || `第 ${episode.number || episodeIndex + 1} 集`}
              </h4>
            </div>
            {episode.estimatedDuration && (
              <span className="text-xs text-muted-foreground">
                预计 {Math.floor(episode.estimatedDuration / 60)} 分钟
              </span>
            )}
          </div>

          {episode.summary && (
            <div className="border-b bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">{episode.summary}</p>
            </div>
          )}

          {episode.scenes?.length > 0 && (
            <div className="space-y-4 p-4">
              {episode.scenes.map((scene: any, sceneIndex: number) => (
                <div
                  key={sceneIndex}
                  className="flex gap-4 rounded-lg bg-muted/30 p-3 transition-colors hover:bg-muted/50"
                >
                  <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                    {scene.scene || sceneIndex + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {scene.location && <span>{scene.location}</span>}
                      {scene.time && <span>{scene.time}</span>}
                    </div>

                    {scene.characters?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scene.characters.map((character: string, characterIndex: number) => (
                          <span
                            key={characterIndex}
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          >
                            {character}
                          </span>
                        ))}
                      </div>
                    )}

                    {scene.action && <p className="text-sm leading-relaxed">{scene.action}</p>}

                    {scene.dialogue && (
                      <div className="border-l-2 border-primary/30 pl-3 text-sm italic text-muted-foreground">
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

