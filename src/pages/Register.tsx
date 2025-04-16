import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link from mother code
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, User, Phone, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
// Features from mother code:
import { useAuth } from '@/contexts/AuthContext'; // Feature 1
import GoogleLoginButton from '@/components/GoogleLoginButton'; // Feature 2

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  // Added from mother code:
  const { register, isAuthenticated } = useAuth();

  // Simple authentication check from mother code
  useEffect(() => {
    // Completely disable auto-navigation after registration
    // We'll handle navigation manually with the "Go to Login" button
    
    // No automatic redirects in this component
    return;
    
    // Keeping the code below commented out as reference
    /*
    if (isAuthenticated) {
      const isRegistering = sessionStorage.getItem('registering');
      if (!isRegistering) {
        navigate('/dashboard');
      }
    }
    */
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Reset messages
    setError('');
    setSuccessMessage('');

    if (!email || !password || !confirmPassword) {
      setError('Email and password are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    
    // Check for at least one symbol
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError('Password must contain at least one symbol (e.g., !@#$%^&*)');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Attempting registration with email:', email);
      
      // Use Firebase Authentication from useAuth context
      // Temporarily store the current user to prevent auto-navigation
      const originalUser = auth.currentUser;
      
      await register(email, password, name);
      
      // If registration is successful, store additional user data in Firestore
      if (auth.currentUser) {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          fullName: name,
          email: email,
          phoneNumber: phone || null,
          dateOfBirth: dob || null,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }
      
      console.log('Data successfully written to Firestore');
      
      // Sign out the user immediately to prevent auto-navigation
      await auth.signOut();
      
      // Show success message instead of navigating
      setSuccessMessage('Successfully registered. Please go back to the login page.');
      
      // Reset form fields
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setPhone('');
      setDob('');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle Firebase auth errors specially
      if (error instanceof FirebaseError) {
        // Handle email already in use error
        if (error.code === 'auth/email-already-in-use') {
          setError('This email is already registered.');
        } else {
          setError(error.message || 'Registration failed');
        }
      } else {
        setError(error.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4 bg-cover bg-center"
      style={{ backgroundImage: 'url("/lovable-uploads/24864662-74cf-48bb-8c67-8791e6431f8b.png")' }}
    >
      <Card className="w-full max-w-md shadow-2xl bg-black/40 backdrop-blur-sm border border-blue-400/30">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-4xl font-bold text-white">Live-Care</CardTitle>
          <CardDescription className="text-blue-200">Create your Live-Care account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded-md mb-4 text-sm border border-red-500/50">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-900/50 text-green-200 p-3 rounded-md mb-4 text-sm border border-green-500/50 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            
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
              <Label htmlFor="phone" className="text-white">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(+91)4563478906"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob" className="text-white">Date of Birth (Optional)</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
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
              <p className="text-xs text-blue-200 mt-1">
                Password must be at least 6 characters with at least one uppercase letter and one symbol.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-blue-300" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-black/50 text-white border-blue-400/50 focus:border-blue-400 focus:ring-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-3 text-blue-300 hover:text-blue-200"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  Creating account...
                </>
              ) : (
                'Create Account'
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
          
          {/* GoogleLoginButton from mother code */}
          <GoogleLoginButton />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {successMessage && (
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Go to Login Page
            </Button>
          )}
          <p className="text-sm text-blue-200 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-300 hover:text-blue-200 hover:underline font-medium">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Register;