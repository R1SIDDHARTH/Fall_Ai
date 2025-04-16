
import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface ProfilePhotoUploadProps {
  onPhotoChange: (photoFile: File, photoDataUrl: string) => void;
  initialPhoto?: string;
  className?: string;
}

const ProfilePhotoUpload = ({ onPhotoChange, initialPhoto, className = '' }: ProfilePhotoUploadProps) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhoto || null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPhotoPreview(result);
        onPhotoChange(file, result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <input 
        type="file" 
        id="profilePhoto" 
        name="profilePhoto"
        accept="image/*" 
        onChange={handlePhotoChange} 
        className="hidden"
      />
      <label htmlFor="profilePhoto" className="cursor-pointer">
        <div className="rounded-full overflow-hidden border-4 border-blue-400 shadow-lg shadow-blue-500/50 w-48 h-48 flex items-center justify-center bg-black/30">
          {photoPreview ? (
            <img 
              src={photoPreview} 
              alt="Profile Preview" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Plus className="h-10 w-10 text-blue-300" />
            </div>
          )}
        </div>
      </label>
      <p className="text-xs text-blue-200/60 mt-2">Add profile pic</p>
    </div>
  );
};

export default ProfilePhotoUpload;
