'use client';

import { useState, useEffect } from 'react';

interface SystemConfig {
  membershipEnabled: boolean;
  accountingPointsEnabled: boolean;
}

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>({
    membershipEnabled: false,
    accountingPointsEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/system/features');
        if (!response.ok) {
          throw new Error('Failed to fetch system config');
        }
        const data = await response.json();
        setConfig(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading, error };
}