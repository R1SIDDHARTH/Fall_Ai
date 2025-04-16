
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AccountSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // User profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
    photo: user?.photo || '/lovable-uploads/7196715f-e658-4a40-8e49-3bd25b1192e8.png'
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleGoBack = () => {
    navigate('/settings');
  };

  const handleSaveProfile = () => {
    setIsEditing(false);
    updateUserProfile({
      name: profile.name,
      phone: profile.phone,
      dob: profile.dob
    });
    
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          setProfile(prev => ({
            ...prev,
            photo: event.target?.result as string
          }));
          
          toast({
            title: "Photo Updated",
            description: "Your profile photo has been updated. Save your profile to apply changes.",
          });
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="bg-black/40 border border-blue-400/30 backdrop-blur-sm rounded-lg shadow-lg p-4 mb-6 flex items-center">
          <Button 
            onClick={handleGoBack} 
            variant="ghost" 
            size="icon"
            className="mr-2 text-blue-300 hover:text-blue-200 hover:bg-black/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Account Information</h1>
        </header>

        <Card className="bg-black/40 border border-blue-400/30 backdrop-blur-sm text-white">
          <CardHeader>
            <CardTitle className="text-blue-300">Account Information</CardTitle>
            <CardDescription className="text-blue-100/70">
              Manage your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg space-y-6">
              <div className="flex flex-col items-center mb-4">
                <div 
                  className="relative cursor-pointer"
                  onClick={handlePhotoClick}
                >
                  <Avatar className="h-20 w-20 border-2 border-blue-400 mb-2">
                    <AvatarImage src={profile.photo} alt={profile.name} />
                    <AvatarFallback className="bg-blue-900 text-blue-200 text-xl">
                      {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute bottom-2 right-0 bg-blue-500 rounded-full p-1">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                {isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2 bg-black/30 border-blue-400/50 text-blue-300 hover:bg-black/40"
                    onClick={handlePhotoClick}
                  >
                    Change Photo
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="name" className="font-medium text-blue-200 block mb-1">Full Name:</Label>
                <Input 
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={handleInputChange}
                  className="bg-black/30 border-blue-400/30 text-blue-100"
                  readOnly={!isEditing}
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="font-medium text-blue-200 block mb-1">Email:</Label>
                <Input 
                  id="email"
                  name="email"
                  value={profile.email}
                  onChange={handleInputChange}
                  className="bg-black/30 border-blue-400/30 text-blue-100"
                  readOnly={!isEditing || user?.id.startsWith('google-')}
                />
              </div>
              
              <div>
                <Label htmlFor="phone" className="font-medium text-blue-200 block mb-1">Phone Number:</Label>
                <Input 
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleInputChange}
                  className="bg-black/30 border-blue-400/30 text-blue-100"
                  readOnly={!isEditing}
                  placeholder={!isEditing && !profile.phone ? "Not set" : ""}
                />
              </div>
              
              <div>
                <Label htmlFor="dob" className="font-medium text-blue-200 block mb-1">Date of Birth:</Label>
                <Input 
                  id="dob"
                  name="dob"
                  type="date"
                  value={profile.dob}
                  onChange={handleInputChange}
                  className="bg-black/30 border-blue-400/30 text-blue-100"
                  readOnly={!isEditing}
                />
              </div>
              
              <Button 
                onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                variant="outline" 
                size="sm" 
                className="w-full mt-4 bg-black/20 border-blue-400/50 text-blue-300 hover:bg-black/40"
              >
                {isEditing ? "Save Profile" : "Edit Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountSettings;
