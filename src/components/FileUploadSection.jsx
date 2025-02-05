import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useDropzone } from 'react-dropzone';
import { UploadIcon, XIcon } from 'lucide-react';

const FileUploadSection = ({ onFileUpload, onAnalyze, isAnalyzing, hasAnalyzed, autoSequence }) => {
  console.log('FileUploadSection autoSequence:', autoSequence);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      // Create a fake event object to match the existing onFileUpload interface
      onFileUpload({ target: { files: [file] } });
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    disabled: isAnalyzing,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'text/plain': ['.txt']
    },
    maxSize: 25 * 1024 * 1024, // 25MB
    noClick: true,
    noKeyboard: true
  });

  const removeFile = () => {
    setUploadedFile(null);
  };

  if (uploadedFile) {
    return (
      <div className="w-full bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <img 
                src="/excel-icon.png" 
                alt="File icon"
                className="w-8 h-8"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMyAySDZhMiAyIDAgMCAwLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOXoiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxMyAyIDEzIDkgMjAgOSI+PC9wb2x5bGluZT48L3N2Zz4=';
                }}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{uploadedFile.name}</h4>
              <p className="text-sm text-gray-500">{(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile();
              }}
              className="text-gray-400 hover:text-gray-500 p-1"
              disabled={isAnalyzing}
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-blue-600">
                {isAnalyzing ? 'Analyzing...' : 'Ready'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {isAnalyzing ? '40%' : '100%'}
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 text-xs flex rounded bg-blue-100">
            <div
              className="transition-all duration-500 ease-out bg-blue-500"
              style={{ width: isAnalyzing ? '40%' : '100%' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 
          transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-center">
          <UploadIcon className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            {isDragActive ? 'Drop the file here' : 'Drag and drop to upload the file'}
          </p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <Button
            type="button"
            variant="outline"
            disabled={isAnalyzing}
            className="mb-4"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            Browse computer
          </Button>
          <div className="text-sm text-gray-500">
            <p>• You can upload TXT files or audio files (MP3, WAV, M4A, OGG)</p>
            <p>• Maximum file size is 25MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadSection;