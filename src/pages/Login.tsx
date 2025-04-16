import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import GoogleLoginButton from '@/components/GoogleLoginButton';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Modified effect to prevent automatic dashboard redirect
  useEffect(() => {
    if (isAuthenticated) {
      // Don't automatically redirect to dashboard
      // Only redirect if explicitly coming from a private route
      const redirectRequired = sessionStorage.getItem('authRedirect');
      if (redirectRequired) {
        sessionStorage.removeItem('authRedirect');
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Authenticate using Firebase via the login function from AuthContext
      await login(email, password);
      console.log('Authentication successful, navigating to device setup');
      
      // Explicitly navigate to device setup after successful login
      navigate('/device-setup');
    } catch (error: any) {
      console.error('Login error:', error);
      
      // More user-friendly error messages
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/invalid-email' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError('Login failed. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: 'url("/lovable-uploads/24864662-74cf-48bb-8c67-8791e6431f8b.png")' }}
    >
      <Card className="w-full max-w-md shadow-2xl bg-black/40 backdrop-blur-sm border border-blue-400/30">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-6xl font-bold text-white">Live-Care</CardTitle>
          
          <div className="flex justify-center my-6">
            <div className="rounded-full overflow-hidden border-4 border-blue-400 shadow-lg shadow-blue-500/50 w-36 h-36 flex items-center justify-center bg-black/30">
              <img 
                src="https://sigmawire.net/i/03/rX52Hy.jpeg" 
                alt="Live-Care"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          <CardDescription className="text-blue-200">Login to your Live-Care account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4 text-sm border border-red-500/50">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Link to="/forgot-password" className="text-sm text-blue-300 hover:text-blue-200">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </form>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-blue-400/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black/30 px-4 text-blue-200">
                OR CONTINUE WITH
              </span>
            </div>
          </div>
          
          <GoogleLoginButton />
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-blue-200">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              state={{ fromLogin: true }}  // Added state to indicate coming from login
              className="text-blue-300 hover:text-blue-200 hover:underline font-medium"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;