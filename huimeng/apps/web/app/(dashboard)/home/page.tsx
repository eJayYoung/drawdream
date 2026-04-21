import Link from 'next/link';
import { Plus, Play, Clock, Star } from 'lucide-react';

// Mock data
const recentProjects = [
  {
    id: '1',
    name: '星际穿越',
    cover: 'https://picsum.photos/seed/space/400/300',
    episodes: 12,
    progress: 65,
    updatedAt: '2小时前',
  },
  {
    id: '2',
    name: '都市恋歌',
    cover: 'https://picsum.photos/seed/city/400/300',
    episodes: 8,
    progress: 30,
    updatedAt: '昨天',
  },
  {
    id: '3',
    name: '古风奇缘',
    cover: 'https://picsum.photos/seed/ancient/400/300',
    episodes: 20,
    progress: 100,
    updatedAt: '3天前',
  },
];

const stats = [
  { label: '我的项目', value: 12, icon: Play },
  { label: '创作中', value: 3, icon: Clock },
  { label: '已完成', value: 8, icon: Star },
];

export default function HomePage() {
  return (
    <div className="space-y-8 px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">欢迎回来</h1>
          <p className="text-muted-foreground">继续你的创意之旅</p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus size={20} />
          新建项目
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-card rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon size={20} className="text-primary" />
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">最近项目</h2>
          <Link
            href="/projects"
            className="text-sm text-primary hover:underline"
          >
            查看全部
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentProjects.map((project) => (
            <Link
              key={project.id}
              href={`/create/${project.id}`}
              className="group bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted relative">
                <img
                  src={project.cover}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play
                    size={48}
                    className="text-white"
                    fill="white"
                  />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-2">{project.name}</h3>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.episodes}集</span>
                  <span>{project.updatedAt}</span>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
