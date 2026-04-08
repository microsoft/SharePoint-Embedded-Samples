import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Scale, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Scale className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Login
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
