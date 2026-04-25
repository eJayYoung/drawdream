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

type ExistingAsset = {
  id: string;
  url: string;
  name?: string;
  comfyAssetId?: string;
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
  existingAssets?: ExistingAsset[];
  onExistingAssetSelected?: (asset: ExistingAsset) => void;
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
        '正面全身': '正面全身 正面照 完整人物',
        '背面全身': '背面全身 背面照 完整人物',
        '侧面全身': '侧面全身 侧面照 完整人物',
        '三视图': '三视图 正面侧面背面',
        '四视图': '四视图 多角度展示',
        '正侧面': '正侧面 双视角',
        '动姿': '动作姿态 动态姿势',
        '站姿': '站立姿势 站姿',
        '坐姿': '坐姿 坐着',
      },
    },
    shotSize: {
      label: '景别',
      tags: {
        '大全景': '大全景 建立镜头',
        '全景': '全景 全身',
        '全身景': '全身景 完整人物',
        '中全景': '中全景',
        '中景': '中景',
        '中近景': '中近景',
        '近景': '近景 特写',
        '特写': '特写 面部特写',
      },
    },
    angle: {
      label: '镜头角度',
      tags: {
        '平视': '平视视角',
        '仰视': '仰视 低角度',
        '俯视': '俯视 高角度',
        '鸟瞰': '鸟瞰 俯拍',
        '过肩': '过肩镜头',
        '倾斜': '倾斜构图',
        '第一人称': '第一人称视角',
      },
    },
    lighting: {
      label: '光线风格',
      tags: {
        '自然光': '自然光 柔和光线',
        '强光': '强光 戏剧光',
        '逆光': '逆光 轮廓光',
        '柔光': '柔光 散射光',
        '戏剧光': '电影感光效',
        '霓虹': '霓虹灯效果',
        '暖光': '暖色调 金色光线',
      },
    },
    style: {
      label: '艺术风格',
      tags: {
        '写实': '写实风格 真实感',
        '古风': '古风 中国传统',
        '水墨': '水墨风格',
        '仙侠': '仙侠风格 飘逸',
        '赛博朋克': '赛博朋克',
        '油画': 'oil painting style',
        '动漫': 'anime style',
      },
    },
    quality: {
      label: '品质修饰',
      tags: {
        '高清': '高清 8K 细节',
        '电影感': '电影感 胶片质感',
        '大师级': '大师级作品',
        '极致细节': '极致细节 精细',
        '专业级': '专业级品质',
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
        '正面全身': '正面全身 正面照 完整人物',
        '背面全身': '背面全身 背面照 完整人物',
        '侧面全身': '侧面全身 侧面照 完整人物',
        '三视图': '三视图 正面侧面背面',
        '四视图': '四视图 多角度展示',
        '正侧面': '正侧面 双视角',
        '动姿': '动作姿态 动态姿势',
        '站姿': '站立姿势 站姿',
        '坐姿': '坐姿 坐着',
      },
    },
    shotSize: {
      label: '景别',
      tags: {
        '大全景': '大全景 建立镜头',
        '全景': '全景 全身',
        '全身景': '全身景 完整人物',
        '中全景': '中全景',
        '中景': '中景',
        '中近景': '中近景',
        '近景': '近景 特写',
        '特写': '特写 面部特写',
      },
    },
    angle: {
      label: '镜头角度',
      tags: {
        '平视': '平视视角',
        '仰视': '仰视 低角度',
        '俯视': '俯视 高角度',
        '鸟瞰': '鸟瞰 俯拍',
        '过肩': '过肩镜头',
        '微仰': '微仰视',
        '侧拍': '侧拍角度',
      },
    },
    lighting: {
      label: '光线风格',
      tags: {
        '自然光': '自然光 柔和光线',
        '柔光': '柔光 梦幻光',
        '逆光': '逆光 轮廓光',
        '暖光': '暖光 金色调',
        '梦幻光': '梦幻光 幻想感',
        '月光': '月光 银色光',
        '霞光': '霞光 晚霞',
      },
    },
    style: {
      label: '艺术风格',
      tags: {
        '写实': '写实风格 真实感',
        '古风': '古风 中国传统',
        '水墨': '水墨风格',
        '仙侠': '仙侠风格 飘逸',
        '唯美': '唯美风格 梦幻',
        '油画': '油画风格',
        '动漫': '动漫风格',
      },
    },
    quality: {
      label: '品质修饰',
      tags: {
        '高清': '高清 8K 细节',
        '电影感': '电影感 胶片质感',
        '大师级': '大师级作品',
        '极致细节': '极致细节 精细',
        '专业级': '专业级品质',
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
  cameraPosition: {
    label: '摄像机位置',
    tags: {
      '场景中央': 'center of scene camera position',
      '场景左侧': 'left side of scene',
      '场景右侧': 'right side of scene',
      '场景边缘': 'edge of scene',
      '场景角落': 'corner of scene',
      '门口': 'doorway entrance camera',
      '窗边': 'window side camera',
      '高处': 'high angle elevated camera',
      '低处': 'low angle ground camera',
    },
  },
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
  shotSize: {
    label: '镜头景别',
    tags: {
      '大全景': 'establishing shot wide establishing',
      '远景': 'long shot distant view',
      '极远景': 'extreme long shot very distant view',
      '全景': 'full shot complete view',
      '中景': 'medium shot waist up',
      '近景': 'close-up shot detailed',
      '特写': 'extreme close-up detail',
    },
  },
  panorama360Size: {
    label: '360空间大小',
    tags: {
      '360小景': '360 panorama VR small room immersive',
      '360中景': '360 panorama VR medium space indoor outdoor',
      '360大景': '360 panorama VR wide angle large space full spherical',
      '360极景': '360 panorama VR extreme wide view cityscape landscape vista',
    },
  },
  panorama360Angle: {
    label: '360摄像机视角',
    tags: {
      '360平视': '360 panorama eye level view horizontal',
      '360俯瞰': '360 panorama bird eye view top down aerial',
      '360仰视': '360 panorama looking up upward angle',
      '360俯视': '360 panorama looking down elevated view',
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
  existingAssets = [],
  onExistingAssetSelected,
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
        <div className="flex flex-1">
          {/* Left: All Categories and Tags */}
          <div className="flex flex-1 flex-col border-r">
            <div className="flex-1 p-4" style={{ maxHeight: 'calc(90vh - 160px)', overflowY: 'auto' }}>
              <div className="flex flex-col flex-wrap gap-2" style={{ height: 'calc(90vh - 200px)' }}>
                {Object.entries(tagCategories).flatMap(([categoryKey, category]) => [
                  <div key={`label-${categoryKey}`} className="text-sm font-bold text-orange-500 px-3 py-1.5">{category.label}</div>,
                  ...Object.entries(category.tags).map(([tagName, tagValue]) => {
                    const isSelected = assetForm.prompt.includes(tagValue);
                    return (
                      <button
                        key={`${categoryKey}-${tagName}`}
                        onClick={() => appendToPrompt(tagValue)}
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:border-primary/50 hover:bg-muted'
                        }`}
                      >
                        <span>{tagName}</span>
                        {isSelected && <X size={12} className="shrink-0" />}
                      </button>
                    );
                  })
                ])}
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
                <div className="space-y-2">
                  {existingAssets.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {existingAssets.map((asset) => (
                        <button
                          key={asset.id}
                          onClick={() => {
                            setReferenceImage(asset.url);
                            if (onExistingAssetSelected) {
                              onExistingAssetSelected(asset);
                            } else if (onReferenceImageSelected) {
                              // 如果没有专门的 handler，尝试用 base64
                              fetch(asset.url)
                                .then(res => res.blob())
                                .then(blob => {
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    onReferenceImageSelected?.(e.target?.result as string);
                                  };
                                  reader.readAsDataURL(blob);
                                });
                            }
                          }}
                          className="shrink-0 rounded-lg border-2 border-dashed p-1 hover:border-primary"
                        >
                          <img src={asset.url} alt={asset.name} className="h-16 w-16 rounded object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed hover:bg-muted/40">
                    <Upload size={18} className="mb-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">上传参考图</span>
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
                </div>
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
