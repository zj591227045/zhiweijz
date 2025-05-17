"use client";

import { useState, useRef } from "react";

interface ThemeImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<void>;
  isLoading?: boolean;
}

export function ThemeImportDialog({
  isOpen,
  onClose,
  onImport,
  isLoading = false,
}: ThemeImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  // 处理拖拽
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // 处理拖放
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // 验证并设置文件
  const validateAndSetFile = (file: File) => {
    setError(null);

    // 检查文件类型
    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      setError("请选择JSON格式的主题文件");
      setSelectedFile(null);
      return;
    }

    // 检查文件大小 (最大1MB)
    if (file.size > 1024 * 1024) {
      setError("文件大小不能超过1MB");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // 触发文件选择
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 提交导入
  const handleSubmit = async () => {
    if (selectedFile && !isLoading) {
      try {
        await onImport(selectedFile);
        setSelectedFile(null);
      } catch (err) {
        setError("导入失败，请检查文件格式");
      }
    } else if (!selectedFile) {
      setError("请选择一个主题文件");
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="modal-content bg-card rounded-lg w-[90%] max-w-md overflow-hidden">
        <div className="modal-header p-4 border-b border-border text-lg font-semibold">
          导入主题
        </div>
        <div className="modal-body p-4">
          <div
            className={`drop-zone border-2 border-dashed rounded-lg p-6 text-center ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            } ${error ? "border-destructive" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              disabled={isLoading}
            />
            <div className="mb-3 text-4xl text-muted-foreground">
              {isLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-file-upload"></i>
              )}
            </div>
            {selectedFile ? (
              <div className="text-foreground">
                已选择: <span className="font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <>
                <p className="mb-2 text-foreground">
                  拖放主题文件到这里，或
                </p>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={handleButtonClick}
                  disabled={isLoading}
                >
                  点击选择文件
                </button>
              </>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              支持JSON格式的主题文件，最大1MB
            </p>
          </div>
        </div>
        <div className="modal-footer flex border-t border-border">
          <button
            className="modal-button cancel flex-1 py-3.5 text-center text-muted-foreground border-r border-border"
            onClick={onClose}
            disabled={isLoading}
          >
            取消
          </button>
          <button
            className="modal-button confirm flex-1 py-3.5 text-center text-primary font-semibold disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? "导入中..." : "导入"}
          </button>
        </div>
      </div>
    </div>
  );
}
