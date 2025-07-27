'use client';

import React, { useState, useEffect } from 'react';
import { AndroidTokenDialog } from './android-token-dialog';

interface AndroidTokenData {
  token: string;
  uploadUrl: string;
  checkTokenUrl: string;
  expiresIn: number;
  expiresAt: number;
  macrodroidConfig: {
    httpMethod: string;
    contentType: string;
    authorizationHeader: string;
    fileFieldName: string;
    bodyParameters: {
      accountBookId: string;
    };
  };
}

export function AndroidTokenManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tokenData, setTokenData] = useState<AndroidTokenData | null>(null);

  useEffect(() => {
    const handleShowAndroidTokenDialog = (event: CustomEvent<AndroidTokenData>) => {
      console.log('🤖 [AndroidTokenManager] 收到显示Android Token对话框事件:', event.detail);
      setTokenData(event.detail);
      setIsDialogOpen(true);
    };

    // 监听显示Android Token对话框的事件
    window.addEventListener('showAndroidTokenDialog', handleShowAndroidTokenDialog as EventListener);

    return () => {
      window.removeEventListener('showAndroidTokenDialog', handleShowAndroidTokenDialog as EventListener);
    };
  }, []);

  return (
    <AndroidTokenDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      tokenData={tokenData}
    />
  );
}
