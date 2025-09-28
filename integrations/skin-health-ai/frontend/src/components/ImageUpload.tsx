import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onFile,
  accept = 'image/*',
  label = 'Upload a photo',
  className = '',
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files[0] || disabled) return;
      
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      onFile(file);
      toast.success('Image uploaded successfully');
    },
    [onFile, disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, disabled]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <Card 
      className={`transition-all duration-200 cursor-pointer ${
        dragOver 
          ? 'border-emerald-500 bg-emerald-50/50 shadow-md' 
          : 'border-dashed border-neutral-300 hover:border-neutral-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className={`mb-4 p-4 rounded-full ${
          dragOver ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 text-neutral-600'
        }`}>
          {dragOver ? (
            <Upload className="h-8 w-8" />
          ) : (
            <ImageIcon className="h-8 w-8" />
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-neutral-900">
            {dragOver ? 'Drop your image here' : 'Drag & drop an image'}
          </p>
          <p className="text-sm text-neutral-500">or</p>
          <Button 
            variant="outline" 
            size="sm"
            disabled={disabled}
            className="bg-neutral-900 text-white hover:bg-neutral-800 border-neutral-900"
          >
            {label}
          </Button>
        </div>
        
        <p className="mt-4 text-xs text-neutral-500">
          JPG, PNG, HEIC up to 10MB
        </p>
        
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
};

export default ImageUpload;
