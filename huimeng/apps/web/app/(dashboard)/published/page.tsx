'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Eye,
  ThumbsUp,
  Share2,
  MoreVertical,
  Link,
  Unlink,
  Film,
} from 'lucide-react';

// Mock published works data
const mockWorks = [
  {
    id: '1',
    title: '星际穿越',
    cover: 'https://picsum.photos/seed/space/400/300',
    episodes: 12,
    views: 12500,
    likes: 890,
    status: 'published',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: '都市恋歌',
    cover: 'https://picsum.photos/seed/city/400/300',
    episodes: 8,
    views: 8300,
    likes: 560,
    status: 'published',
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    title: '古风奇缘',
    cover: 'https://picsum.photos/seed/ancient/400/300',
    episodes: 20,
    views: 0,
    likes: 0,
    status: 'draft',
    createdAt: '2024-01-05',
  },
];

export default function PublishedPage() {
  const router = useRouter();
  const [works, setWorks] = useState<any[]>(mockWorks);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filteredWorks = works.filter((w) => {
    return filter === 'all' || w.status === filter;
  });

  const handleTogglePublish = (id: string) => {
    setWorks(
      works.map((w) =>
        w.id === id
          ? {
              ...w,
              status: w.status === 'published' ? 'draft' : 'published',
              views: w.status === 'draft' ? 1 : w.views,
              likes: w.status === 'draft' ? 0 : w.likes,
            }
          : w
      )
    );
    setMenuOpenId(null);
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/watch/${id}`;
    navigator.clipboard.writeText(url);
    alert('链接已复制');
    setMenuOpenId(null);
  };

  return (
    <div className="space-y-6 px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">发布作品</h1>
          <p className="text-muted-foreground">管理已发布的短剧作品</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: '全部' },
          { value: 'published', label: '已发布' },
          { value: 'draft', label: '草稿' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Works */}
      {filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Film size={48} className="mb-4 opacity-50" />
          <p>暂无作品</p>
          <button
            onClick={() => router.push('/create')}
            className="mt-4 text-primary hover:underline"
          >
            去创作
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorks.map((work) => (
            <div
              key={work.id}
              className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="flex gap-6 p-4">
                {/* Thumbnail */}
                <div
                  className="w-48 aspect-video bg-muted rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => router.push(`/watch/${work.id}`)}
                >
                  {work.cover ? (
                    <img
                      src={work.cover}
                      alt={work.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={32} className="text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{work.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {work.episodes} 集 · {work.createdAt}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuOpenId(menuOpenId === work.id ? null : work.id)
                        }
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpenId === work.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-card rounded-lg border shadow-lg py-1 z-10">
                          <button
                            onClick={() => router.push(`/watch/${work.id}`)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            <Eye size={14} />
                            预览
                          </button>
                          <button
                            onClick={() => handleCopyLink(work.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            <Link size={14} />
                            复制链接
                          </button>
                          <button
                            onClick={() => handleTogglePublish(work.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            {work.status === 'published' ? (
                              <>
                                <Unlink size={14} />
                                下架
                              </>
                            ) : (
                              <>
                                <Share2 size={14} />
                                发布
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye size={16} />
                      {work.views.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <ThumbsUp size={16} />
                      {work.likes.toLocaleString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        work.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {work.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Video Player Placeholder */}
              {work.status === 'published' && (
                <div className="border-t p-4 bg-muted/30">
                  <div className="flex gap-2 overflow-x-auto">
                    {Array.from({ length: work.episodes }).map((_, i) => (
                      <button
                        key={i}
                        className="flex-shrink-0 w-24 aspect-video bg-black rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                        onClick={() => router.push(`/watch/${work.id}/episode/${i + 1}`)}
                      >
                        <Play size={24} className="text-white" fill="white" />
                        <span className="text-white text-sm ml-1">第{i + 1}集</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
