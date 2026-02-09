import { useState, useRef, useEffect, useCallback } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Crown, Info, Camera, User, Loader2 } from 'lucide-react';
import { auth, googleProvider } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { useApp, checkGuestCredentials, registerGuest } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Compress image to reduce size for Firestore storage
const compressImage = (file: File, maxSize: number = 150): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG with compression
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const LoginPage = () => {
  const { login } = useApp();
  const [guestUsername, setGuestUsername] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [isGuestLogin, setIsGuestLogin] = useState(true); // true = login, false = register
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle redirect result (for Safari/Brave fallback)
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          login({
            id: result.user.uid,
            name: result.user.displayName || 'Warrior',
            email: result.user.email || undefined,
            photoUrl: result.user.photoURL || undefined,
            isGuest: false,
          });
        }
      } catch (err) {
        console.error('Redirect sign-in error:', err);
      }
    };
    handleRedirectResult();
  }, [login]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      login({
        id: user.uid,
        name: user.displayName || 'Warrior',
        email: user.email || undefined,
        photoUrl: user.photoURL || undefined,
        isGuest: false,
      });
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      
      // Handle specific Firebase errors
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/popup-closed-by-user') {
          // User closed popup, no error needed
          setError(null);
        } else if (err.code === 'auth/missing-or-invalid-nonce' || 
                   err.code === 'auth/credential-already-in-use') {
          // Retry with fresh state
          setError('Please try again');
        } else if (err.code === 'auth/popup-blocked') {
          // Fallback to redirect for browsers that block popups
          try {
            await signInWithRedirect(auth, googleProvider);
          } catch {
            setError('Sign-in failed. Please try again.');
          }
        } else {
          setError(err.message);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (!guestUsername.trim() || !guestPassword.trim()) {
      setError('Please enter both username and password');
      return;
    }
    
    // Require profile image for registration
    if (!isGuestLogin && !profileImage) {
      setError('Please upload a profile picture');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (isGuestLogin) {
        // Login mode - check credentials
        const result = await checkGuestCredentials(guestUsername.trim(), guestPassword);
        if (result.success && result.user) {
          login(result.user);
        } else {
          setError(result.error || 'Invalid username or password');
        }
      } else {
        // Register mode - create new guest
        const result = await registerGuest(guestUsername.trim(), guestPassword, profileImage || undefined);
        if (result.success && result.user) {
          login(result.user);
        } else {
          setError(result.error || 'Failed to register');
        }
      }
    } catch (err) {
      console.error('Guest auth error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress image to reduce size for Firestore
        const compressedImage = await compressImage(file, 150);
        setProfileImage(compressedImage);
      } catch (error) {
        console.error('Error compressing image:', error);
        setError('Failed to process image. Please try a different one.');
      }
    }
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Crown Logo with Star */}
        <div className="mb-6 relative">
          {/* Small golden star behind */}
          <svg 
            className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400 animate-pulse" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
          </svg>
          <Crown className="h-14 w-14 text-yellow-400 animate-bounce-slow" strokeWidth={2} />
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3">
          <span className="text-blue-400">LetsGo</span>
          <span className="text-yellow-400">Kings</span>
        </h1>
        <p className="text-gray-400 text-base mb-10">
          Master your energy. Live your dream life.
        </p>

        {/* Buttons - No Card */}
        {!showGuestForm ? (
          <div className="w-full max-w-sm space-y-4">
            {/* Error Message */}
            {error && (
              <Alert className="bg-red-500/10 border-red-500/50 rounded-full">
                <AlertDescription className="text-sm text-red-400 text-center">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Google Login */}
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 bg-white text-gray-900 hover:bg-gray-100 font-medium rounded-full disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Continue with Google'
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0a0e17] px-3 text-gray-500">or</span>
              </div>
            </div>

            {/* Guest Login Button */}
            <Button
              variant="outline"
              onClick={() => setShowGuestForm(true)}
              className="w-full h-12 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 rounded-full"
            >
              <User className="h-4 w-4 mr-2" />
              Continue as Guest
            </Button>

            {/* Join message */}
            <p className="text-center text-sm text-gray-500 pt-4">
              Join <span className="text-blue-400">thousands</span> of men reclaiming <span className="text-blue-400">their</span> power through discipline
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm space-y-5">
            {/* Guest Info */}
            <Alert className="bg-[#151a26] border-gray-700 rounded-lg">
              <Info className="h-4 w-4 text-gray-400" />
              <AlertDescription className="text-sm text-gray-400 ml-2">
                Please remember username and password for future login.
              </AlertDescription>
            </Alert>

            {/* Login/Register Toggle */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setIsGuestLogin(true)}
                className={`text-sm font-medium transition-colors ${
                  isGuestLogin ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsGuestLogin(false)}
                className={`text-sm font-medium transition-colors ${
                  !isGuestLogin ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <Alert className="bg-red-500/10 border-red-500/50 rounded-lg">
                <AlertDescription className="text-sm text-red-400 text-center">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Profile Image Upload - Only show in register mode */}
            {!isGuestLogin && (
              <div className="flex justify-center">
                <div 
                  onClick={triggerFileInput}
                  className="relative w-24 h-24 rounded-full overflow-hidden cursor-pointer group border-2 border-blue-500/50 hover:border-blue-400 transition-colors"
                >
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#151a26] flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Username Input */}
            <Input
              placeholder="username"
              value={guestUsername}
              onChange={(e) => setGuestUsername(e.target.value)}
              className="h-12 bg-[#151a26] border-gray-700 text-white placeholder:text-gray-500 rounded-full focus:border-blue-500 px-5"
            />

            {/* Password Input */}
            <Input
              type="password"
              placeholder="password"
              value={guestPassword}
              onChange={(e) => setGuestPassword(e.target.value)}
              className="h-12 bg-[#151a26] border-gray-700 text-white placeholder:text-gray-500 rounded-full focus:border-blue-500 px-5"
              onKeyDown={(e) => e.key === 'Enter' && handleGuestLogin()}
            />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowGuestForm(false)}
                className="flex-1 h-12 border-gray-700 text-gray-300 hover:bg-gray-700/50 rounded-full"
              >
                Back
              </Button>
              <Button
                onClick={handleGuestLogin}
                disabled={isLoading}
                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isGuestLogin ? 'Logging in...' : 'Registering...'}
                  </>
                ) : (
                  isGuestLogin ? 'Login' : 'Register'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Quote */}
      <div className="text-center py-8 px-4">
        <p className="text-sm text-gray-500 italic">
          "Every time you say <span className="text-blue-400">no</span>, your <span className="text-yellow-400">future</span>  says thank you. "
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
