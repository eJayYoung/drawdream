'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Film,
  Clock,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'creating' | 'completed'>('all');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('获取项目列表失败');
      }

      const data: any[] = await res.json();
      setProjects(data);
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      console.error('Failed to delete project:', err);
    }
    setMenuOpenId(null);
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'creating' && p.status === 'draft') ||
      (filter === 'completed' && p.status === 'completed');
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目管理</h1>
          <p className="text-muted-foreground">管理你的所有短剧项目</p>
        </div>
        <button
          onClick={() => router.push('/create')}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          <Plus size={20} />
          新建项目
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'creating', label: '创作中' },
            { value: 'completed', label: '已完成' },
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
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Film size={48} className="mb-4 opacity-50" />
          <p>暂无项目</p>
          <button
            onClick={() => router.push('/create')}
            className="mt-4 text-primary hover:underline"
          >
            创建第一个项目
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="aspect-video bg-muted relative cursor-pointer"
                onClick={() => router.push(`/create/${project.id}`)}
              >
                {project.coverImageUrl ? (
                  <img
                    src={project.coverImageUrl}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film size={48} className="text-muted-foreground opacity-50" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === project.id ? null : project.id);
                    }}
                    className="p-1.5 bg-black/50 rounded-lg hover:bg-black/70"
                  >
                    <MoreVertical size={16} className="text-white" />
                  </button>
                  {menuOpenId === project.id && (
                    <div className="absolute right-0 mt-1 w-36 bg-card rounded-lg border shadow-lg py-1 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/create/${project.id}`);
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Eye size={14} />
                        查看
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Edit functionality
                          setMenuOpenId(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Pencil size={14} />
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-500"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold mb-1">{project.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Film size={14} />
                    {project.episodeCount || 0} 集
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${project.status === 'completed' ? 100 : (project.episodeCount || 0) * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
