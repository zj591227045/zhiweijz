/**
 * 版本检查组件导出
 * 提供完整的版本检查和更新管理功能
 */

// 核心组件
export { EnhancedVersionProvider } from './EnhancedVersionProvider';
export { EnhancedVersionUpdateDialog } from './EnhancedVersionUpdateDialog';
export { AutoVersionChecker } from './AutoVersionChecker';

// 指示器组件
export {
  VersionCheckIndicator,
  SimpleVersionCheckIndicator,
  NetworkStatusIndicator,
} from './VersionCheckIndicator';

// 设置和调试组件
export { VersionCheckSettings } from '../settings/VersionCheckSettings';
export { VersionCheckDebugPanel } from './VersionCheckDebugPanel';

// Hooks
export {
  useEnhancedVersion,
  useManualVersionCheck,
  useVersionInfo,
  useVersionCheckControl,
} from './EnhancedVersionProvider';

export { useVersionCheckStatus, useVersionCheckDebug } from './AutoVersionChecker';

// 服务
export { versionCheckService } from '../../lib/services/versionCheckService';

// 类型
export type {
  Platform,
  UserAction,
  VersionCheckData,
  VersionCheckResult,
} from '../../lib/services/versionCheckService';

export type {
  UseEnhancedVersionCheckOptions,
  UseEnhancedVersionCheckReturn,
} from '../../hooks/useEnhancedVersionCheck';
