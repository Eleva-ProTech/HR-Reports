import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import MediaLibraryModal from './MediaLibraryModal';
import { Image as ImageIcon, X, FileText, Eye } from 'lucide-react';
import { getImagePath } from '@/utils/helpers';

interface MediaPickerProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  multiple?: boolean;
  placeholder?: string;
  showPreview?: boolean;
  readOnly?: boolean;
}

export default function MediaPicker({
  label,
  value = '',
  onChange,
  multiple = false,
  placeholder = 'Select image...',
  showPreview = true,
  readOnly = false
}: MediaPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const handleSelect = (selectedUrl: string) => {
    // Keep the full media path for proper URL construction
    // If it's a full URL, extract the path
    if (selectedUrl.startsWith('http')) {
      const url = new URL(selectedUrl);
      // Extract path from URL and keep everything after domain
      // e.g., http://localhost:8000/storage/media/file.pdf -> /storage/media/file.pdf or storage/media/file.pdf
      let path = url.pathname;
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      onChange(path);
    } else {
      // If it's already a path, use it as is
      onChange(selectedUrl);
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const isPdf = (url: string) => {
    if (!url) return false;
    const extension = url.split('.').pop()?.toLowerCase();
    return extension === 'pdf';
  };

  const handlePreviewPdf = (url: string) => {
    setPreviewUrl(getDisplayUrl(url));
  };

  // Ensure value is always a string, never null
  const safeValue = value || '';

  // Process the image URL for preview
  const getDisplayUrl = (url: string) => {
    if (!url) return '';

    // If it's already a full URL, use it as is
    if (url.startsWith('http')) {
      return url;
    }

    // If it starts with /, just prepend the origin
    if (url.startsWith('/')) {
      return window.location.origin + url;
    }

    // If it contains storage/media, prepend the origin
    if (url.includes('storage/media')) {
      return window.location.origin + '/' + url;
    }

    // Otherwise, prepend /storage/media/
    return window.location.origin + '/storage/media/' + url;
  };

  const imageUrls = safeValue ? [getDisplayUrl(safeValue)] : [];

  const getFileIcon = (url: string) => {
    if (!url) return null;
    const extension = url.split('.').pop()?.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return null; // Return null for images to show actual image
    }

    if (extension === 'pdf') return <div className="h-16 w-16 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">PDF</div>;
    if (['doc', 'docx'].includes(extension || '')) return <div className="h-16 w-16 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">DOC</div>;
    if (['xls', 'xlsx', 'csv'].includes(extension || '')) return <div className="h-16 w-16 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold">XLS</div>;
    if (['ppt', 'pptx'].includes(extension || '')) return <div className="h-16 w-16 bg-orange-500 rounded text-white text-xs flex items-center justify-center font-bold">PPT</div>;

    return <div className="h-16 w-16 bg-gray-500 rounded text-white text-xs flex items-center justify-center font-bold">FILE</div>;
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div className="flex gap-2">
        <Input
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly || multiple}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          disabled={readOnly}
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Browse
        </Button>
        {safeValue && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleClear}
            disabled={readOnly}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Preview */}
      {showPreview && imageUrls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mt-2">
          {imageUrls.map((url, index) => {
            const fileIcon = getFileIcon(url);
            const isPdfFile = isPdf(safeValue);
            return (
              <div key={index} className="relative">
                {fileIcon ? (
                  <div className="w-full h-20 flex items-center justify-center rounded border bg-muted relative group">
                    {fileIcon}
                    {isPdfFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded"
                        onClick={() => handlePreviewPdf(safeValue)}
                        title="Preview PDF"
                      >
                        <Eye className="h-5 w-5 text-white" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-20 object-cover rounded border"
                    onError={(e) => {
                      // If image fails to load, show file icon
                      const target = e.target as HTMLImageElement;
                      const container = target.parentElement;
                      if (container) {
                        container.innerHTML = '<div class="w-full h-20 flex items-center justify-center rounded border bg-muted"><div class="h-16 w-16 bg-gray-500 rounded text-white text-xs flex items-center justify-center font-bold">FILE</div></div>';
                      }
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <MediaLibraryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelect}
        multiple={multiple}
      />

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">PDF Preview</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPreviewUrl(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                src={`${previewUrl}#toolbar=1`}
                className="w-full h-full"
                title="PDF Preview"
              />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t dark:border-slate-700">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Open in New Tab
              </a>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewUrl(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
