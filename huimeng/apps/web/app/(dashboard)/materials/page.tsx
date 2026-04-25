'use client';

import { useState, useEffect, useCallback } from 'react';
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
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Material {
  id: string;
  assetId: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  url: string;
  size: string;
  createdAt: string;
  source?: string;
  projectName?: string;
  characterName?: string;
  sceneName?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'workflow'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/materials?page=1&pageSize=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const materialsList = data.items.map((m: any) => ({
          id: m.id,
          assetId: m.assetId,
          type: m.fileType,
          name: m.originFileName,
          url: m.url,
          size: m.size > 0 ? `${(m.size / (1024 * 1024)).toFixed(1)}MB` : '-',
          createdAt: new Date(m.createdAt).toISOString().split('T')[0],
          source: m.source,
          projectName: m.projectName,
          characterName: m.characterName,
          sceneName: m.sceneName,
        }));
        setMaterials(materialsList);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const filteredMaterials = materials.filter((m) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchLower) ||
      m.projectName?.toLowerCase().includes(searchLower) ||
      m.characterName?.toLowerCase().includes(searchLower) ||
      m.sceneName?.toLowerCase().includes(searchLower);
    const matchesFilter = filter === 'all' || m.type === filter;
    const matchesSource = sourceFilter === 'all' || m.source === sourceFilter;
    return matchesSearch && matchesFilter && matchesSource;
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
        const res = await fetch(`${API_URL}/api/generation/assets/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (res.ok) {
          // 重新获取素材列表
          await fetchMaterials();
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
      const res = await fetch(`${API_URL}/api/materials/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      let blob: Blob;
      let filename = material.name;

      if (material.assetId) {
        // 通过 dataUrl 接口获取 base64 数据
        const token = getToken();
        const res = await fetch(`${API_URL}/api/generation/assets/${material.assetId}/dataurl`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch file');
        const data = await res.json();
        if (!data.dataUrl) throw new Error('No dataUrl returned');

        // 解析 base64
        const response = await fetch(data.dataUrl);
        blob = await response.blob();
      } else if (material.url) {
        // 直接从 OSS 下载
        const res = await fetch(material.url);
        if (!res.ok) throw new Error('Failed to fetch file');
        blob = await res.blob();
      } else {
        alert('下载失败，无法获取文件');
        return;
      }

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败');
    }
  };

  const handlePreview = (index: number) => {
    setPreviewIndex(index);
  };

  const previewMaterial = previewIndex !== null ? filteredMaterials[previewIndex] : null;

  const goToPreviousPreview = () => {
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const goToNextPreview = () => {
    if (previewIndex !== null && previewIndex < filteredMaterials.length - 1) {
      setPreviewIndex(previewIndex + 1);
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
    <div className="space-y-6 px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">素材管理</h1>
          <p className="text-muted-foreground">管理你的图片、视频和音频素材</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
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
          <button
            onClick={() => fetchMaterials()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw size={18} />
            刷新
          </button>
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
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">来源:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">全部</option>
              <option value="upload">上传</option>
              <option value="workflow">AI生成</option>
            </select>
          </div>
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

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-primary">
          <Upload size={18} className="animate-pulse" />
          <span>上传中...</span>
        </div>
      )}

      {/* Materials */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>加载中...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <ImageIcon size={48} className="mb-4 opacity-50" />
          <p>暂无素材</p>
          <label className="mt-4 text-primary hover:underline cursor-pointer">
            上传第一个素材
          </label>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMaterials.map((material, idx) => (
            <div
              key={material.id}
              className="group bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-muted relative cursor-pointer"
                onClick={() => handlePreview(idx)}
              >
                {material.type === 'image' && material.url ? (
                  <img
                    src={material.url}
                    alt={material.name}
                    className="w-full h-full object-cover"
                  />
                ) : material.type === 'video' ? (
                  <video
                    src={material.url}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getIcon(material.type)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePreview(idx); }}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(material); }}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(material.id); }}
                    className="p-2 bg-white rounded-lg hover:bg-gray-100 text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-2">
                <p className="text-sm truncate" title={material.name}>
                  {material.name}
                </p>
                <p className="text-xs text-muted-foreground">{material.size}</p>
                {(material.projectName || material.characterName || material.sceneName) && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {material.projectName && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {material.projectName}
                      </span>
                    )}
                    {material.characterName && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {material.characterName}
                      </span>
                    )}
                    {material.sceneName && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {material.sceneName}
                      </span>
                    )}
                  </div>
                )}
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
                {(material.projectName || material.characterName || material.sceneName) && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {material.projectName && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {material.projectName}
                      </span>
                    )}
                    {material.characterName && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {material.characterName}
                      </span>
                    )}
                    {material.sceneName && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {material.sceneName}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(material)}
                  className="p-2 hover:bg-muted rounded-lg"
                >
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

      {/* Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="absolute inset-0" onClick={() => setPreviewIndex(null)} />
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Close button */}
            <button
              onClick={() => setPreviewIndex(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPreviousPreview}
                disabled={previewIndex === 0}
                className="p-2 text-white hover:text-gray-300 disabled:opacity-30"
              >
                <ChevronLeft size={32} />
              </button>
              <span className="text-white text-sm">
                {previewIndex !== null ? previewIndex + 1 : 0} / {filteredMaterials.length}
              </span>
              <button
                onClick={goToNextPreview}
                disabled={previewIndex === filteredMaterials.length - 1}
                className="p-2 text-white hover:text-gray-300 disabled:opacity-30"
              >
                <ChevronRight size={32} />
              </button>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto flex items-center justify-center">
              {previewMaterial.type === 'image' ? (
                <img
                  src={previewMaterial.url}
                  alt={previewMaterial.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              ) : previewMaterial.type === 'video' ? (
                <video
                  src={previewMaterial.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh]"
                />
              ) : (
                <div className="text-white flex flex-col items-center gap-4">
                  {getIcon(previewMaterial.type)}
                  <p>不支持预览此类型</p>
                  <button
                    onClick={() => handleDownload(previewMaterial)}
                    className="px-4 py-2 bg-white text-black rounded-lg"
                  >
                    下载
                  </button>
                </div>
              )}
            </div>

            {/* Material info */}
            <div className="mt-4 text-white text-center">
              <p className="font-medium">{previewMaterial.name}</p>
              <p className="text-sm text-gray-400">
                {previewMaterial.size} · {previewMaterial.createdAt}
              </p>
              {(previewMaterial.projectName || previewMaterial.characterName || previewMaterial.sceneName) && (
                <div className="flex gap-2 justify-center mt-2">
                  {previewMaterial.projectName && (
                    <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                      {previewMaterial.projectName}
                    </span>
                  )}
                  {previewMaterial.characterName && (
                    <span className="text-xs bg-green-600 px-2 py-0.5 rounded">
                      {previewMaterial.characterName}
                    </span>
                  )}
                  {previewMaterial.sceneName && (
                    <span className="text-xs bg-purple-600 px-2 py-0.5 rounded">
                      {previewMaterial.sceneName}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
