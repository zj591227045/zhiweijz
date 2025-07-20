// Capacitor类型定义
declare global {
  interface Window {
    Capacitor?: {
      getPlatform(): string;
      isNativePlatform(): boolean;
      Plugins?: {
        App?: {
          getInfo(): Promise<{
            version: string;
            build: string;
            id: string;
            name: string;
          }>;
        };
        Browser?: {
          open(options: { url: string }): Promise<void>;
        };
      };
    };
  }
}

export {};
