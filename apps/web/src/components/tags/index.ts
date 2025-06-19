/**
 * 标签组件导出
 */

// 标签显示相关组件
export { TagDisplay, TagBadge, TagList } from './tag-display';

// 颜色选择器组件
export { ColorPicker, SimpleColorPicker, ColorPreview } from './color-picker';

// 标签选择器组件
export { TagSelector, MobileTagSelector } from './tag-selector';

// 标签管理组件
export { TagManager } from './tag-manager';

// 标签编辑模态框
export { TagEditModal } from './tag-edit-modal';

// 标签推荐组件
export { TagRecommendation, CompactTagRecommendation } from './tag-recommendation';

// 标签模板组件
export { TagTemplateSelector } from './tag-template';

// 移动端标签组件
export { MobileTagSection, CompactTagRecommendationV2 } from './mobile-tag-section';

// 重新导出类型定义
export type {
  Tag,
  TagResponseDto,
  CreateTagDto,
  UpdateTagDto,
  TagQueryParams,
  TagListResponse,
  TagDetailResponse,
  AddTransactionTagsDto,
  BatchTransactionTagsDto,
  BatchTransactionTagsResponse,
  TagStatisticsQuery,
  TagStatisticsResponse,
  TagTrendsQuery,
  TagTrendsResponse,
  TagSuggestionsQuery,
  TagSuggestionsResponse,
} from '@/lib/api/types/tag.types';

// 重新导出常量
export {
  TagValidation,
  DEFAULT_TAG_COLORS,
  TagErrorCode,
  TagErrorMessages,
} from '@/lib/api/types/tag.types';

// 重新导出API客户端
export { tagApi } from '@/lib/api/tag-api';
