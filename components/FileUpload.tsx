
import React from 'react';
import { UploadedFile } from '../types';
import { ICONS, anonymizeAddress } from '../constants';

interface FileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesChange, files }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const base64 = await fileToBase64(file);
      
      // Anonymize the file name itself to ensure no leakage
      const sanitizedName = anonymizeAddress(file.name);
      
      newFiles.push({
        name: sanitizedName,
        type: file.type,
        base64
      });
    }
    onFilesChange([...files, ...newFiles]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]); // Remove data:mime;base64,
      };
      reader.onerror = error => reject(error);
    });
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="relative group cursor-pointer border-2 border-dashed border-zinc-800 rounded-xl p-8 transition-all hover:border-blue-500 hover:bg-zinc-900/50">
        <input
          type="file"
          multiple
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
          <div className="p-3 bg-zinc-900 rounded-lg group-hover:scale-110 transition-transform">
            <ICONS.FileText />
          </div>
          <p className="text-zinc-400 font-medium">Upload Strata Documents</p>
          <p className="text-zinc-500 text-sm">PDF, JPEG (Contract, Minutes, Bylaws)</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="text-blue-500 flex-shrink-0"><ICONS.FileText /></div>
                <span className="text-sm truncate text-zinc-300">{file.name}</span>
              </div>
              <button 
                onClick={() => removeFile(idx)}
                className="text-zinc-500 hover:text-red-500 transition-colors"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
