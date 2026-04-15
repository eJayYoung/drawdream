'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Wand2, Loader2 } from 'lucide-react';

const aspectRatios = [
  { value: '16:9', label: '16:9 横屏', desc: '适合电影感' },
  { value: '9:16', label: '9:16 竖屏', desc: '适合短视频' },
  { value: '1:1', label: '1:1 方屏', desc: '适合社交媒体' },
];

const styles = [
  { value: 'ancient', label: '古风', emoji: '🏯' },
  { value: 'scifi', label: '科幻', emoji: '🚀' },
  { value: 'modern', label: '现代', emoji: '🌆' },
  { value: 'fantasy', label: '奇幻', emoji: '🧙' },
  { value: 'romance', label: '浪漫', emoji: '💕' },
  { value: 'horror', label: '悬疑', emoji: '🔮' },
];

const imageModels = [
  { value: 'sdxl', label: 'SDXL 1.0', desc: '高质量图像' },
  { value: 'sdxl-turbo', label: 'SDXL Turbo', desc: '快速生成' },
  { value: 'dalle3', label: 'DALL-E 3', desc: 'OpenAI绘画' },
];

const videoModels = [
  { value: 'svd', label: 'Stable Video', desc: '图生视频' },
  { value: 'sora', label: 'Sora', desc: 'OpenAI视频' },
  { value: 'pika', label: 'Pika', desc: 'AI视频生成' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CreateProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [style, setStyle] = useState('modern');
  const [imageModel, setImageModel] = useState('sdxl');
  const [videoModel, setVideoModel] = useState('svd');
  const [loading, setLoading] = useState(false);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('请输入项目名称');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('请先登录');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: '',
          aspectRatio,
          style,
          imageModel,
          videoModel,
        }),
      });

      if (!res.ok) {
        throw new Error('创建项目失败');
      }

      const data = await res.json();
      router.push(`/create/${data.id}`);
    } catch (err: any) {
      alert(err.message || '创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">新建项目</h1>
        <p className="text-muted-foreground">
          填写基本信息，开启AI创作之旅
        </p>
      </div>

      {/* Project Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">项目名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给你的短剧起个名字"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">视频比例</label>
        <div className="grid grid-cols-3 gap-4">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.value}
              onClick={() => setAspectRatio(ratio.value)}
              className={`p-4 border rounded-lg text-left transition-all ${
                aspectRatio === ratio.value
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="aspect-video bg-muted rounded mb-2 flex items-center justify-center">
                <div
                  className={`bg-muted-foreground/30 ${
                    ratio.value === '16:9'
                      ? 'w-3/4 h-1/2'
                      : ratio.value === '9:16'
                      ? 'w-1/3 h-3/4'
                      : 'w-1/2 h-1/2'
                  } rounded`}
                />
              </div>
              <p className="font-medium text-sm">{ratio.label}</p>
              <p className="text-xs text-muted-foreground">{ratio.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div className="space-y-3">
        <label className="block text-sm font-medium">视频风格</label>
        <div className="grid grid-cols-3 gap-4">
          {styles.map((s) => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`p-4 border rounded-lg text-center transition-all ${
                style === s.value
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'hover:border-primary/50'
              }`}
            >
              <span className="text-2xl mb-1 block">{s.emoji}</span>
              <p className="font-medium text-sm">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Models */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium">生图模型</label>
          <div className="space-y-2">
            {imageModels.map((model) => (
              <button
                key={model.value}
                onClick={() => setImageModel(model.value)}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  imageModel === model.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
              >
                <p className="font-medium">{model.label}</p>
                <p className="text-xs text-muted-foreground">{model.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium">视频模型</label>
          <div className="space-y-2">
            {videoModels.map((model) => (
              <button
                key={model.value}
                onClick={() => setVideoModel(model.value)}
                className={`w-full p-3 border rounded-lg text-left transition-all ${
                  videoModel === model.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
              >
                <p className="font-medium">{model.label}</p>
                <p className="text-xs text-muted-foreground">{model.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            创建中...
          </>
        ) : (
          <>
            <Wand2 size={20} />
            开始创作
            <ArrowRight size={20} />
          </>
        )}
      </button>
    </div>
  );
}
