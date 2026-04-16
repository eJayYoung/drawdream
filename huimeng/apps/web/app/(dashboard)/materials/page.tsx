'use client';

import { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  Image as ImageIcon,
  Film,
  Music,
  Trash2,
  Download,
  Grid,
  List,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Mock materials data
const mockMaterials = [
  { id: '1', type: 'image', name: '背景图1.jpg', url: 'https://picsum.photos/seed/1/200', size: '2.3MB', createdAt: '2024-01-15' },
  { id: '2', type: 'video', name: '素材视频1.mp4', url: '', size: '45MB', createdAt: '2024-01-14' },
  { id: '3', type: 'audio', name: '背景音乐1.mp3', url: '', size: '5.2MB', createdAt: '2024-01-13' },
  { id: '4', type: 'image', name: '角色图1.png', url: 'https://picsum.photos/seed/2/200', size: '1.8MB', createdAt: '2024-01-12' },
  { id: '5', type: 'image', name: '场景图2.jpg', url: 'https://picsum.photos/seed/3/200', size: '3.1MB', createdAt: '2024-01-11' },
  { id: '6', type: 'video', name: '参考视频2.mp4', url: '', size: '128MB', createdAt: '2024-01-10' },
];

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<any[]>(mockMaterials);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || m.type === filter;
    return matchesSearch && matchesFilter;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const token = getToken();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_URL}/api/materials/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const newMaterial = {
            id: data.id || `local-${Date.now()}`,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'audio',
            name: file.name,
            url: data.url || '',
            size: `${(file.size / (1024 * 1024)).toFixed(1)}MB`,
            createdAt: new Date().toISOString().split('T')[0],
          };
          setMaterials([newMaterial, ...materials]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个素材吗？')) return;

    const token = getToken();
    try {
      await fetch(`${API_URL}/api/materials/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMaterials(materials.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={24} className="text-blue-500" />;
      case 'video':
        return <Film size={24} className="text-purple-500" />;
      case 'audio':
        return <Music size={24} className="text-green-500" />;
      default:
        return <ImageIcon size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">素材管理</h1>
          <p className="text-muted-foreground">管理你的图片、视频和音频素材</p>
        </div>
        <label className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 cursor-pointer">
          <Upload size={20} />
          上传素材
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="搜索素材..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {[
              { value: 'all', label: '全部' },
              { value: 'image', label: '图片' },
              { value: 'video', label: '视频' },
              { value: 'audio', label: '音频' },
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
          <div className="flex gap-1 border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-muted' : ''}`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-muted' : ''}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-primary">
          <Upload size={18} className="animate-pulse" />
          <span>上传中...</span>
        </div>
      )}

      {/* Materials */}
      {filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>暂无素材</p>
          <label className="mt-4 text-primary hover:underline cursor-pointer">
            上传第一个素材
          </label>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="group bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-muted relative">
                {material.type === 'image' && material.url ? (
                  <img
                    src={material.url}
                    alt={material.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getIcon(material.type)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-white rounded-lg hover:bg-gray-100">
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-sm truncate">{material.name}</p>
                <p className="text-xs text-muted-foreground">{material.size}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          {filteredMaterials.map((material, index) => (
            <div
              key={material.id}
              className={`flex items-center gap-4 p-4 ${
                index !== filteredMaterials.length - 1 ? 'border-b' : ''
              }`}
            >
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                {getIcon(material.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{material.name}</p>
                <p className="text-sm text-muted-foreground">
                  {material.size} · {material.createdAt}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-muted rounded-lg">
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(material.id)}
                  className="p-2 hover:bg-muted rounded-lg text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
