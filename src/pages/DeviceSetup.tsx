import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, QrCode, Wifi, Tablet, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const DeviceSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deviceId, setDeviceId] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('');
  const [enteredCaptcha, setEnteredCaptcha] = useState('');
  const [formError, setFormError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Fixed unique 6-character device ID - not displayed to user but used for validation
  const correctDeviceId = 'Y7X@r6';

  // Generate a captcha code on component mount
  useEffect(() => {
    generateCaptchaCode();
  }, []);

  // Function to generate a 5-character captcha code
  const generateCaptchaCode = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setCaptchaCode(result);
  };

  // Regenerate captcha code
  const refreshCaptcha = () => {
    generateCaptchaCode();
    setEnteredCaptcha('');
  };

  const handleNext = () => {
    if (step === 2) {
      // Validate both device ID and captcha
      if (deviceId === correctDeviceId && enteredCaptcha === captchaCode) {
        setFormError(false);
        setErrorMessage('');
        setStep(step + 1);
      } else {
        setFormError(true);
        
        // Set specific error message based on what's wrong
        if (deviceId !== correctDeviceId && enteredCaptcha !== captchaCode) {
          setErrorMessage("Both Device ID and Captcha are incorrect.");
        } else if (deviceId !== correctDeviceId) {
          setErrorMessage("Device ID is incorrect.");
        } else {
          setErrorMessage("Captcha is incorrect.");
        }
        
        toast({
          title: "Validation Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Refresh captcha on failed attempt
        refreshCaptcha();
      }
    } else if (step < 3) {
      setStep(step + 1);
    } else {
      handleDeviceSetup();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setFormError(false);
      setErrorMessage('');
    }
  };
  
  // Updated function to navigate back to login page without dashboard redirect
  const handleBackToLogin = () => {
    // Clear any auth state if needed
    sessionStorage.removeItem('authRedirect');
    // Navigate to login without triggering dashboard redirect
    navigate('/login');
  };

  const handleDeviceSetup = async () => {
    try {
      setIsLoading(true);
      
      // Simulate API call to Python backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Device Setup Complete",
        description: "Your device has been successfully configured.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "There was an error setting up your device. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="flex justify-center">
                <img 
                  src="/lovable-uploads/b0828401-df99-416f-9e97-441e3fdf63ce.png" 
                  alt="Blue Dot"
                  className="w-32 h-32 object-contain"
                />
              </div>
              <p className="text-blue-100">Power on your Live-Care device and wait for the status light to blink blue.</p>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleNext}
            >
              Device is Powered On
            </Button>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <QrCode className="h-24 w-24 text-blue-300 mb-4 mx-auto" />
              <p className="text-blue-100">Scan the QR code on the back of your device to get the device ID.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="device-id" className="text-white">Device ID</Label>
              <div className="relative">
                <Input
                  id="device-id"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter Device ID"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className={`bg-black/50 text-white border-blue-400/50 pr-10 ${formError && deviceId !== correctDeviceId ? 'border-red-500' : ''}`}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-blue-300"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <Label htmlFor="captcha" className="text-white">Captcha</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-blue-300 hover:text-blue-200 p-1"
                  onClick={refreshCaptcha}
                >
                  Refresh
                </Button>
              </div>
              <div className="font-mono bg-blue-900/70 p-2 rounded text-center mb-2">
                <span className="text-white text-xl tracking-wider">{captchaCode}</span>
              </div>
              <Input
                id="captcha"
                type="text"
                placeholder="Enter the captcha above"
                value={enteredCaptcha}
                onChange={(e) => setEnteredCaptcha(e.target.value)}
                className={`bg-black/50 text-white border-blue-400/50 ${formError && enteredCaptcha !== captchaCode ? 'border-red-500' : ''}`}
                required
              />
              {formError && (
                <p className="text-red-500 text-sm">{errorMessage}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1 border-blue-400/50 text-blue-300"
                onClick={handleBack}
              >
                Back
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleNext}
                disabled={!deviceId || !enteredCaptcha}
              >
                Next
              </Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img 
                  src="/lovable-uploads/54820891-5114-4e94-820d-2fdc3ed97e1c.png" 
                  alt="WiFi and Tablet"
                  className="w-36 h-36 object-contain"
                />
              </div>
              <p className="text-blue-100">We're ready to connect to your device. Press the button below to complete setup.</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="flex-1 border-blue-400/50 text-blue-300"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleDeviceSetup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect Device"
                )}
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: 'url("/lovable-uploads/24864662-74cf-48bb-8c67-8791e6431f8b.png")' }}
    >
      <Card className="w-full max-w-md shadow-2xl bg-black/40 backdrop-blur-sm border border-blue-400/30">
        <CardHeader className="space-y-1 text-center relative">
          {/* Back button on the top-left corner (only visible for step 1) */}
          {step === 1 && (
            <div className="absolute top-2 left-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-900/20 p-1"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                <span>Back</span>
              </Button>
            </div>
          )}
          
          <CardTitle className="text-2xl font-bold text-white mt-6">Device Setup</CardTitle>
          <CardDescription className="text-blue-200">
            Configure your Live-Care device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              {[1, 2, 3].map(i => (
                <div 
                  key={i} 
                  className={`w-10 h-10 rounded-full flex items-center justify-center
                    ${step === i ? 'bg-blue-600 text-white' : 
                      step > i ? 'bg-blue-900/50 text-blue-200' : 'bg-gray-800/50 text-gray-400'}`}
                >
                  {i}
                </div>
              ))}
            </div>
            <div className="relative h-2 bg-gray-700 rounded-full mb-4">
              <div 
                className="absolute top-0 left-0 h-2 bg-blue-600 rounded-full"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
          
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceSetup;