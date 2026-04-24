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
  characterGender?: string;
  assetType?: 'character' | 'scene';
};

// 标签映射表（按性别区分）
const TAG_CATEGORIES = {
  male: {
    clothing: {
      label: '服饰风格',
      tags: {
        '古装': '中国古代男子服饰长袍束腰带比甲深衣汉服唐装',
        '劲装': '劲装束腰短打便于行动武打装束',
        '长袍': '长袍广袖衣袂飘飘古风长衫',
        '黑衣': '黑衣夜行装束暗卫刺客装',
        '官服': '官服朝服补子官衣',
        '铠甲': '铠甲披挂战甲武将甲胄',
        '常服': '常服便装日常服饰',
        '战袍': '战袍披风武将战袍',
        '书生装': '书生装长衫文士服',
        '将领装': '将领装铠甲武将',
        '侠客装': '侠客装束腰带斗篷',
        '锦衣卫': '飞鱼服绣春刀锦衣卫',
      },
    },
    assetType: {
      label: '资产类型',
      tags: {
        '正面全身': 'front view full body shot',
        '背面全身': 'back view full body shot',
        '侧面全身': 'side view full body shot',
        '三视图': 'three views front side back',
        '四视图': 'four views front back side perspective',
        '正侧面': 'front and side view',
        '动姿': 'action pose dynamic',
        '站姿': 'standing pose',
        '坐姿': 'sitting pose',
      },
    },
    shotSize: {
      label: '景别',
      tags: {
        '大全景': 'extreme wide shot',
        '全景': 'wide shot full shot',
        '全身景': 'full shot',
        '中全景': 'medium wide shot',
        '中景': 'medium shot',
        '中近景': 'medium close up',
        '近景': 'close up',
        '特写': 'extreme close up',
      },
    },
    angle: {
      label: '镜头角度',
      tags: {
        '平视': 'eye level shot',
        '仰视': 'low angle shot',
        '俯视': 'high angle shot',
        '鸟瞰': "bird's eye view",
        '过肩': 'over the shoulder',
        '倾斜': 'dutch angle',
        '第一人称': 'first person view',
      },
    },
    lighting: {
      label: '光线风格',
      tags: {
        '自然光': 'natural lighting',
        '强光': 'dramatic lighting',
        '逆光': 'backlit rim light',
        '柔光': 'soft lighting',
        '戏剧光': 'cinematic lighting',
        '霓虹': 'neon lights',
        '暖光': 'warm tones',
      },
    },
    style: {
      label: '艺术风格',
      tags: {
        '写实': 'realistic detailed',
        '古风': 'traditional Chinese style',
        '水墨': 'Chinese ink painting',
        '仙侠': 'xianxia fantasy',
        '赛博朋克': 'cyberpunk',
        '油画': 'oil painting style',
        '动漫': 'anime style',
      },
    },
    quality: {
      label: '品质修饰',
      tags: {
        '高清': 'high resolution 8k',
        '电影感': 'cinematic film grain',
        '大师级': 'masterpiece',
        '极致细节': 'hyper detailed',
        '专业级': 'professional',
      },
    },
  },
  female: {
    clothing: {
      label: '服饰风格',
      tags: {
        '古装': '中国古代女子服饰襦裙广袖流仙裙汉服唐装',
        '劲装': '劲装束腰短打便于行动武打装束女子',
        '长裙': '长裙广袖飘逸仙子裙古风裙装',
        '旗袍': '旗袍修身曲线中式礼服',
        '常服': '常服便装日常服饰女子',
        '华服': '华服锦缎绸衣裙贵族女子',
        '战甲': '女子战甲护腕披肩武将',
        '侠客服': '侠客服束腰带斗篷女子武侠',
        '宫廷装': '宫廷装贵妃宫妃公主',
        '婚服': '凤冠霞帔红妆嫁衣',
        '仙侠服': '仙侠服飘逸仙子古装',
        '侍女装': '侍女装丫鬟婢女服饰',
      },
    },
    assetType: {
      label: '资产类型',
      tags: {
        '正面全身': 'front view full body shot',
        '背面全身': 'back view full body shot',
        '侧面全身': 'side view full body shot',
        '三视图': 'three views front side back',
        '四视图': 'four views front back side perspective',
        '正侧面': 'front and side view',
        '动姿': 'action pose dynamic',
        '站姿': 'standing pose',
        '坐姿': 'sitting pose',
      },
    },
    shotSize: {
      label: '景别',
      tags: {
        '大全景': 'extreme wide shot',
        '全景': 'wide shot full shot',
        '全身景': 'full shot',
        '中全景': 'medium wide shot',
        '中景': 'medium shot',
        '中近景': 'medium close up',
        '近景': 'close up',
        '特写': 'extreme close up',
      },
    },
    angle: {
      label: '镜头角度',
      tags: {
        '平视': 'eye level shot',
        '仰视': 'low angle shot looking up',
        '俯视': 'high angle shot looking down',
        '鸟瞰': "bird's eye view",
        '过肩': 'over the shoulder',
        '微仰': 'slightly upward angle',
        '侧拍': 'side angle',
      },
    },
    lighting: {
      label: '光线风格',
      tags: {
        '自然光': 'natural lighting soft glow',
        '柔光': 'soft lighting dreamy',
        '逆光': 'backlit rim light ethereal',
        '暖光': 'warm golden tones',
        '梦幻光': 'dreamy fantasy lighting',
        '月光': 'moonlight silver glow',
        '霞光': 'sunset glow rosy',
      },
    },
    style: {
      label: '艺术风格',
      tags: {
        '写实': 'realistic detailed beautiful',
        '古风': 'traditional Chinese style elegant',
        '水墨': 'Chinese ink painting delicate',
        '仙侠': 'xianxia fantasy ethereal',
        '唯美': 'beautiful aesthetic dreamy',
        '油画': 'oil painting style classical',
        '动漫': 'anime style cute',
      },
    },
    quality: {
      label: '品质修饰',
      tags: {
        '高清': 'high resolution 8k ultra detailed',
        '电影感': 'cinematic film grain beautiful',
        '大师级': 'masterpiece award winning',
        '极致细节': 'extremely detailed intricate',
        '专业级': 'professional studio quality',
      },
    },
  },
};

const getTagCategories = (gender: string | undefined, assetType?: 'character' | 'scene') => {
  if (assetType === 'scene') {
    return SCENE_TAG_CATEGORIES as Record<string, { label: string; tags: Record<string, string> }>;
  }
  if (gender === '女') {
    return TAG_CATEGORIES.female as Record<string, { label: string; tags: Record<string, string> }>;
  }
  return TAG_CATEGORIES.male as Record<string, { label: string; tags: Record<string, string> }>;
};

const MALE_CATEGORIES = TAG_CATEGORIES.male;
const FEMALE_CATEGORIES = TAG_CATEGORIES.female;

// 场景标签映射表
const SCENE_TAG_CATEGORIES = {
  sceneType: {
    label: '场景类型',
    tags: {
      '室内': 'indoor interior room',
      '室外': 'outdoor exterior street',
      '自然': 'natural landscape nature',
      '城市': 'city urban metropolis',
      '乡村': 'countryside village rural',
      '古代': 'ancient traditional historical',
      '现代': 'modern contemporary',
      '未来': 'futuristic sci-fi cyberpunk',
      '奇幻': 'fantasy magical mystical',
    },
  },
  location: {
    label: '地点元素',
    tags: {
      '客厅': 'living room sofa couch',
      '卧室': 'bedroom bed pillow',
      '厨房': 'kitchen stove cabinet',
      '餐厅': 'restaurant dining table',
      '办公室': 'office desk computer',
      '街道': 'street road sidewalk',
      '广场': 'plaza square public',
      '森林': 'forest trees woods',
      '海边': 'beach sea ocean waves',
      '山顶': 'mountain peak summit cliff',
      '沙漠': 'desert sand dunes',
      '废墟': 'ruins abandoned decay',
    },
  },
  timeAtmosphere: {
    label: '时间氛围',
    tags: {
      '清晨': 'early morning sunrise dawn',
      '白天': 'daytime daylight bright',
      '黄昏': 'dusk sunset golden hour',
      '夜晚': 'night nightfall dark',
      '深夜': 'midnight late night',
      '黎明': 'dawn morning mist',
    },
  },
  weather: {
    label: '天气状况',
    tags: {
      '晴朗': 'clear sky sunny bright',
      '阴天': 'overcast cloudy grey',
      '雨天': 'rain rainy wet',
      '雪天': 'snow snowy winter',
      '雾天': 'foggy misty fog',
      '大风': 'windy strong wind',
      '暴风雨': 'storm thunder lightning',
    },
  },
  lighting: {
    label: '光线风格',
    tags: {
      '自然光': 'natural lighting soft',
      '强光': 'dramatic lighting contrast',
      '逆光': 'backlit rim light silhouette',
      '柔光': 'soft lighting gentle',
      '戏剧光': 'cinematic lighting moody',
      '霓虹': 'neon lights colorful',
      '暖光': 'warm tones golden',
      '冷光': 'cool tones blue',
      '烛光': 'candlelight warm cozy',
    },
  },
  style: {
    label: '艺术风格',
    tags: {
      '写实': 'realistic detailed photorealistic',
      '古风': 'traditional Chinese style',
      '水墨': 'Chinese ink painting',
      '仙侠': 'xianxia fantasy ethereal',
      '赛博朋克': 'cyberpunk neon futuristic',
      '油画': 'oil painting style classical',
      '动漫': 'anime style illustration',
      '水彩': 'watercolor style delicate',
    },
  },
  quality: {
    label: '品质修饰',
    tags: {
      '高清': 'high resolution 8k ultra detailed',
      '电影感': 'cinematic film grain',
      '大师级': 'masterpiece award winning',
      '极致细节': 'extremely detailed intricate',
      '专业级': 'professional studio quality',
    },
  },
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
  characterGender,
  assetType,
}: AssetGeneratorModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleSetError = (err: string | null) => {
    setError(err);
    setLocalError?.(err);
  };

  const appendToPrompt = (tagValue: string) => {
    const currentPrompt = assetForm.prompt;
    // If already selected, remove it
    if (currentPrompt.includes(tagValue)) {
      setAssetForm((current) => ({
        ...current,
        prompt: current.prompt.replace(tagValue, '').replace(/\s+/g, ' ').trim(),
      }));
      return;
    }
    setAssetForm((current) => ({
      ...current,
      prompt: current.prompt ? `${current.prompt} ${tagValue}` : tagValue,
    }));
  };

  const tagCategories = getTagCategories(characterGender, assetType);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex h-[90vh] w-[90vw] flex-col rounded-xl bg-card shadow-[0_0_60px_hsl(45_70%_70%_/_0.2),_0_12px_48px_hsl(0_0%_0%_/_0.4)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4 shrink-0">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: All Categories and Tags */}
          <div className="flex flex-1 flex-col overflow-hidden border-r">
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-row gap-6">
                {Object.entries(tagCategories).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="flex flex-col gap-2 w-[120px] shrink-0">
                    <div className="text-sm font-medium text-primary">{category.label}</div>
                    <div className="flex flex-col gap-1">
                      {Object.entries(category.tags).map(([tagName, tagValue]) => {
                        const isSelected = assetForm.prompt.includes(tagValue);
                        return (
                          <button
                            key={tagName}
                            onClick={() => appendToPrompt(tagValue)}
                            className={`rounded-lg border px-3 py-1.5 text-sm text-left transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'hover:border-primary/50 hover:bg-muted'
                            }`}
                          >
                            <span>{tagName}</span>
                            {isSelected && <X size={12} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Prompt and Reference */}
          <div className="flex w-[400px] flex-col p-4 shrink-0">
            {/* Prompt Input */}
            <div className="mb-4 flex-1">
              <label className="mb-1 block text-sm font-medium">提示词</label>
              <textarea
                value={assetForm.prompt}
                onChange={(event) => {
                  setAssetForm((current) => ({ ...current, prompt: event.target.value }));
                  handleSetError(null);
                }}
                className="h-full min-h-[200px] w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="描述你想生成的图像内容..."
              />
              {error && (
                <p className="mt-1 text-sm text-destructive">{error}</p>
              )}
            </div>

            {/* Reference Image */}
            <div>
              <label className="mb-1 block text-sm font-medium">参考图</label>
              {referenceImage ? (
                <div className="relative">
                  <img
                    src={referenceImage}
                    alt="reference"
                    className="h-40 w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="absolute right-2 top-2 rounded bg-black/50 p-1 text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted/40">
                  <Upload size={22} className="mb-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">点击上传参考图</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (loadEvent) =>
                        setReferenceImage(loadEvent.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t p-4 shrink-0">
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
