
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { appConfig } from '../config/appConfig';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const Login = () => {
  const { isAuthenticated, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await login();
      toast({
        title: "Login successful",
        description: "You have been successfully authenticated.",
      });
    } catch (error) {
      console.error('Login failed:', error);
      setError(error instanceof Error ? error.message : 'Authentication failed');
      toast({
        title: "Login failed",
        description: "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if the required configuration is set
  const isConfigured = appConfig.clientId && appConfig.tenantId && appConfig.containerTypeId;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side - Brand and illustration */}
          <div className="bg-blue-600 p-8 md:w-2/5 relative overflow-hidden">
            <div className="text-white relative z-10">
              <h3 className="text-lg font-medium">Contoso</h3>
              <h2 className="text-2xl font-bold">Project</h2>
              <h2 className="text-2xl font-bold">Management</h2>
              <h2 className="text-2xl font-bold mb-2">Service</h2>
              <p className="text-sm text-blue-100">Everything you need for convenient team work</p>
            </div>
            
            {/* Stylized abstract pattern */}
            <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-72 h-72">
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-20">
                <path fill="#FFFFFF" d="M40.7,-67.2C54.3,-61.8,68,-53.9,76.9,-41.9C84.9,-29.8,88.1,-14.9,87.1,-0.5C86.1,13.8,80.8,27.6,72.5,39.4C64.2,51.2,52.7,61,40.1,68.5C27.4,76,13.7,81.1,-0.2,81.3C-14.1,81.5,-28.2,76.9,-41.1,69.4C-54,62,-65.8,51.7,-73.2,39C-80.6,26.2,-83.5,13.1,-84,0C-84.4,-13.1,-82.3,-26.1,-77.1,-36.5C-67.9,-46.8,-55.6,-54.4,-43.2,-60.8C-30.7,-67.1,-15.4,-72.3,-0.5,-71.4C14.3,-70.6,28.6,-63.8,40.7,-67.2Z" transform="translate(100 100)" />
              </svg>
            </div>
            
            {/* Geometric pattern elements */}
            <div className="absolute inset-0">
              <div className="absolute top-5 right-5 w-16 h-16 border-4 border-white/20 rounded-full"></div>
              <div className="absolute bottom-10 left-5 w-24 h-24 border-4 border-white/15 rounded-lg transform rotate-45"></div>
              <div className="absolute top-1/3 left-10 w-8 h-8 bg-white/10 rounded-full"></div>
              <div className="absolute bottom-1/3 right-10 w-12 h-12 bg-white/10 rounded-md transform rotate-12"></div>
            </div>
            
            {/* Connected dots pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="dotGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="15" cy="15" r="2" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotGrid)" />
                <line x1="15" y1="15" x2="45" y2="45" stroke="white" strokeWidth="0.5" />
                <line x1="45" y1="15" x2="75" y2="45" stroke="white" strokeWidth="0.5" />
                <line x1="45" y1="45" x2="75" y2="15" stroke="white" strokeWidth="0.5" />
                <line x1="15" y1="45" x2="45" y2="75" stroke="white" strokeWidth="0.5" />
                <line x1="45" y1="75" x2="75" y2="75" stroke="white" strokeWidth="0.5" />
                <line x1="75" y1="45" x2="105" y2="75" stroke="white" strokeWidth="0.5" />
              </svg>
            </div>
            
            {/* Ripple effect circles */}
            <div className="absolute left-1/2 top-3/4 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 rounded-full border border-white/20 animate-pulse"></div>
              <div className="w-48 h-48 rounded-full border border-white/15 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
              <div className="w-64 h-64 rounded-full border border-white/10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            </div>
          </div>
          
          {/* Right side - Login form */}
          <div className="p-8 md:w-3/5 bg-gray-50">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-blue-600 mb-2 text-center">Welcome Back</h2>
              <p className="text-center text-gray-500 mb-8">Log in to continue to your account</p>
              
              <Card className="shadow-none border-0 bg-transparent">
                <CardContent className="p-0">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="block text-sm font-medium">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="example.company@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="block text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button className="text-sm text-blue-600 hover:underline">
                          Forgot the password?
                        </button>
                      </div>
                    </div>
                    
                    {error && (
                      <Alert variant="destructive" className="my-4">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                
                    {!isConfigured && (
                      <Alert className="bg-blue-50 border-blue-200 text-blue-700 my-4">
                        <AlertTitle>Configuration Required</AlertTitle>
                        <AlertDescription>
                          You must configure CLIENT_ID, TENANT_ID, and CONTAINER_TYPE_ID before login will work.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button
                      onClick={handleLogin}
                      disabled={loading || !isConfigured}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        'Signing in...'
                      ) : (
                        <>
                          <LogIn size={18} />
                          Log in
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
