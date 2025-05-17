"use client";

interface ThemeImportExportProps {
  onImport: () => void;
  onExport: () => void;
  isLoading?: boolean;
}

export function ThemeImportExport({
  onImport,
  onExport,
  isLoading = false,
}: ThemeImportExportProps) {
  return (
    <div className="import-export-buttons flex gap-4 mb-6">
      <button
        className="import-button flex-1 flex items-center justify-center gap-2 bg-background border border-border rounded-lg py-3 text-foreground hover:bg-muted/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onImport}
        disabled={isLoading}
      >
        {isLoading ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : (
          <i className="fas fa-file-import"></i>
        )}
        <span>导入主题</span>
      </button>
      <button
        className="export-button flex-1 flex items-center justify-center gap-2 bg-background border border-border rounded-lg py-3 text-foreground hover:bg-muted/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onExport}
        disabled={isLoading}
      >
        {isLoading ? (
          <i className="fas fa-spinner fa-spin"></i>
        ) : (
          <i className="fas fa-file-export"></i>
        )}
        <span>导出主题</span>
      </button>
    </div>
  );
}
