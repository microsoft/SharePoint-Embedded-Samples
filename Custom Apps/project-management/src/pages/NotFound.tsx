
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  // Using optional chaining to handle the case where AuthContext isn't available
  const { isAuthenticated = false } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">Page not found</h2>
        <p className="mt-4 text-base text-gray-500">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link to={isAuthenticated ? "/" : "/login"}>
              Go back to {isAuthenticated ? "home" : "login"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
