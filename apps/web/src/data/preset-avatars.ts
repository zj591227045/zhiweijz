export interface PresetAvatar {
  id: string;
  name: string;
  category: string;
  emoji?: string;
  color?: string;
  url?: string;
}

export interface AvatarCategory {
  id: string;
  name: string;
  icon: string;
}

// 头像分类
export const avatarCategories: AvatarCategory[] = [
  { id: 'standard', name: '标准', icon: '👤' },
  { id: 'animals', name: '动物', icon: '🐱' },
  { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'objects', name: '物品', icon: '🎯' },
];

// 预设头像数据
export const presetAvatars: PresetAvatar[] = [
  // 标准头像
  { id: 'avatar-1', name: '默认头像1', category: 'standard', emoji: '👤', color: '#4F46E5' },
  { id: 'avatar-2', name: '默认头像2', category: 'standard', emoji: '👨', color: '#059669' },
  { id: 'avatar-3', name: '默认头像3', category: 'standard', emoji: '👩', color: '#DC2626' },
  { id: 'avatar-4', name: '默认头像4', category: 'standard', emoji: '🧑', color: '#7C3AED' },

  // 动物头像
  { id: 'cat-1', name: '猫咪', category: 'animals', emoji: '🐱', color: '#F59E0B' },
  { id: 'dog-1', name: '小狗', category: 'animals', emoji: '🐶', color: '#8B5CF6' },
  { id: 'panda-1', name: '熊猫', category: 'animals', emoji: '🐼', color: '#06B6D4' },
  { id: 'fox-1', name: '狐狸', category: 'animals', emoji: '🦊', color: '#EF4444' },
  { id: 'rabbit-1', name: '兔子', category: 'animals', emoji: '🐰', color: '#10B981' },
  { id: 'bear-1', name: '熊', category: 'animals', emoji: '🐻', color: '#F97316' },

  // 自然头像
  { id: 'tree-1', name: '大树', category: 'nature', emoji: '🌳', color: '#22C55E' },
  { id: 'flower-1', name: '花朵', category: 'nature', emoji: '🌸', color: '#EC4899' },
  { id: 'sun-1', name: '太阳', category: 'nature', emoji: '☀️', color: '#FBBF24' },
  { id: 'moon-1', name: '月亮', category: 'nature', emoji: '🌙', color: '#6366F1' },
  { id: 'star-1', name: '星星', category: 'nature', emoji: '⭐', color: '#FCD34D' },

  // 物品头像
  { id: 'heart-1', name: '爱心', category: 'objects', emoji: '❤️', color: '#EF4444' },
  { id: 'crown-1', name: '皇冠', category: 'objects', emoji: '👑', color: '#FBBF24' },
  { id: 'gift-1', name: '礼物', category: 'objects', emoji: '🎁', color: '#8B5CF6' },
  { id: 'diamond-1', name: '钻石', category: 'objects', emoji: '💎', color: '#06B6D4' },
  { id: 'fire-1', name: '火焰', category: 'objects', emoji: '🔥', color: '#F97316' },
];

// 安全的 base64 编码函数
function safeBase64Encode(str: string): string {
  // 在浏览器环境中使用 btoa
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }

  // 在 Node.js 环境中使用 Buffer（仅在运行时，不在构建时）
  if (typeof global !== 'undefined' && global.Buffer) {
    return global.Buffer.from(str).toString('base64');
  }

  // 简单的 base64 编码实现（作为降级方案）
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;

    const bitmap = (a << 16) | (b << 8) | c;

    result += chars.charAt((bitmap >> 18) & 63);
    result += chars.charAt((bitmap >> 12) & 63);
    result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
    result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
  }

  return result;
}

// 根据头像数据获取显示URL
export const getAvatarUrl = (avatar: PresetAvatar): string => {
  if (avatar.url) {
    return avatar.url;
  }

  // 检查是否在浏览器环境
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && avatar.emoji) {
    try {
      // 使用 emoji 作为头像，创建一个 data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 64;
        canvas.height = 64;

        // 设置背景色
        ctx.fillStyle = avatar.color || '#6B7280';
        ctx.fillRect(0, 0, 64, 64);

        // 绘制 emoji
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(avatar.emoji, 32, 32);

        return canvas.toDataURL();
      }
    } catch (error) {
      // 在构建时或其他环境中可能会失败，使用降级方案
      console.warn('Canvas rendering failed, using SVG fallback:', error);
    }
  }

  // 降级方案：返回一个简单的 SVG（适用于服务端渲染和构建时）
  const svg = `
    <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" fill="${avatar.color || '#6B7280'}"/>
      <text x="32" y="38" font-family="Arial" font-size="28" text-anchor="middle" fill="white">
        ${avatar.emoji || '👤'}
      </text>
    </svg>
  `;

  // 使用安全的 Base64 编码
  return `data:image/svg+xml;base64,${safeBase64Encode(svg)}`;
};

// 根据头像ID获取显示URL
export const getAvatarUrlById = (avatarId: string): string | null => {
  const avatar = presetAvatars.find((a) => a.id === avatarId);
  return avatar ? getAvatarUrl(avatar) : null;
};
