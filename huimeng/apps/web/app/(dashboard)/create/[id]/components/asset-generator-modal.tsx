'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Loader2, Sparkles, Upload, X } from 'lucide-react';

type AssetForm = {
  type: 'image' | 'video';
  prompt: string;
  tags: string;
  angle: string;
  shotSize: string;
};

type AssetGeneratorModalProps = {
  open: boolean;
  title: string;
  assetForm: AssetForm;
  setAssetForm: Dispatch<SetStateAction<AssetForm>>;
  referenceImage: string | null;
  setReferenceImage: Dispatch<SetStateAction<string | null>>;
  onReferenceImageSelected?: (base64Data: string) => Promise<string | undefined>;
  generatingAsset: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  setLocalError?: (error: string | null) => void;
};

export function AssetGeneratorModal({
  open,
  title,
  assetForm,
  setAssetForm,
  referenceImage,
  setReferenceImage,
  onReferenceImageSelected,
  generatingAsset,
  onClose,
  onSubmit,
  setLocalError,
}: AssetGeneratorModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSetError = (err: string | null) => {
    setError(err);
    setLocalError?.(err);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-xl rounded-xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">镜头角度</label>
              <select
                value={assetForm.angle}
                onChange={(event) =>
                  setAssetForm((current) => ({ ...current, angle: event.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">默认角度</option>
                <option value="eye level shot">平视</option>
                <option value="low angle shot">仰视</option>
                <option value="high angle shot">俯视</option>
                <option value="bird's eye view">鸟瞰</option>
                <option value="over the shoulder">过肩</option>
                <option value="dutch angle">倾斜构图</option>
                <option value="point of view">第一人称</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">景别</label>
              <select
                value={assetForm.shotSize}
                onChange={(event) =>
                  setAssetForm((current) => ({ ...current, shotSize: event.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">默认景别</option>
                <option value="extreme wide shot">大全景</option>
                <option value="wide shot">全景</option>
                <option value="full shot">全身景</option>
                <option value="medium wide shot">中全景</option>
                <option value="medium shot">中景</option>
                <option value="medium close up">中近景</option>
                <option value="close up">近景</option>
                <option value="extreme close up">特写</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">提示词</label>
            <textarea
              value={assetForm.prompt}
              onChange={(event) => {
                setAssetForm((current) => ({ ...current, prompt: event.target.value }));
                handleSetError(null);
              }}
              className="min-h-[96px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="描述你想生成的图像内容..."
            />
            {error && (
              <p className="mt-1 text-sm text-destructive">{error}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">参考图</label>
            {referenceImage ? (
              <div className="relative">
                <img
                  src={referenceImage}
                  alt="reference"
                  className="h-32 w-full rounded-lg object-cover"
                />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted/40">
                <Upload size={22} className="mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">点击上传参考图</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (loadEvent) => {
                      const base64 = loadEvent.target?.result as string;
                      setReferenceImage(base64);
                      if (onReferenceImageSelected) {
                        await onReferenceImageSelected(base64);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t p-4">
          <button
            onClick={onClose}
            disabled={generatingAsset}
            className="rounded-lg border px-4 py-2 hover:bg-muted disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (!assetForm.prompt.trim()) {
                handleSetError('请先输入资产提示词');
                return;
              }
              handleSetError(null);
              void onSubmit();
            }}
            disabled={generatingAsset}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {generatingAsset ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                生成资产
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
