export interface AppVersionRequest {
  platform: 'web' | 'ios' | 'android';
  version: string;
  buildNumber: number;
  versionCode: number;
  releaseNotes?: string;
  downloadUrl?: string;
  appStoreUrl?: string;
  detailUrl?: string; // 详细更新情况链接
  isForceUpdate?: boolean;
  isEnabled?: boolean;
}

export interface AppVersionResponse {
  id: string;
  platform: 'WEB' | 'IOS' | 'ANDROID';
  version: string;
  buildNumber: number;
  versionCode: number;
  releaseNotes?: string | null;
  downloadUrl?: string | null;
  appStoreUrl?: string | null;
  detailUrl?: string | null; // 详细更新情况链接
  isForceUpdate: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  createdBy?: string | null;
}

export interface VersionCheckRequest {
  platform: 'web' | 'ios' | 'android';
  currentVersion?: string;
  currentBuildNumber?: number;
}

export interface VersionCheckResponse {
  hasUpdate: boolean;
  latestVersion?: AppVersionResponse;
  isForceUpdate: boolean;
  updateMessage?: string;
  userStatus?: UserVersionStatusResponse;
}

export interface UserVersionStatusResponse {
  id: string;
  userId: string;
  platform: 'WEB' | 'IOS' | 'ANDROID';
  appVersionId: string;
  version: string;
  versionCode: number;
  status: 'PENDING' | 'POSTPONED' | 'IGNORED' | 'UPDATED';
  postponedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserVersionStatusRequest {
  platform: 'web' | 'ios' | 'android';
  appVersionId: string;
  status: 'postponed' | 'ignored' | 'updated';
  postponedUntil?: Date;
}

export interface VersionConfigRequest {
  key: string;
  value: string;
  description?: string;
}

export interface VersionConfigResponse {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVersionRequest extends AppVersionRequest {
  publishNow?: boolean;
}

export interface UpdateVersionRequest extends Partial<AppVersionRequest> {
  publishNow?: boolean;
}

export interface VersionListQuery {
  platform?: 'web' | 'ios' | 'android';
  isEnabled?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'publishedAt' | 'versionCode';
  orderDirection?: 'asc' | 'desc';
}

export interface VersionStatsResponse {
  totalVersions: number;
  platformStats: Record<string, number>;
  latestVersions: Record<string, AppVersionResponse>;
}