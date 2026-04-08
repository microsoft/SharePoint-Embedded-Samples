import { useAuth } from "@/context/AuthContext";
import { Shield, Briefcase, Scale, FileCheck, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const features = [
  {
    icon: Shield,
    title: "Attorney-Client Privilege Protected",
    description: "End-to-end encryption and compliance with legal confidentiality requirements",
  },
  {
    icon: Briefcase,
    title: "Case Management Excellence",
    description: "Organize briefs, depositions, and evidence with intelligent categorization",
  },
  {
    icon: Scale,
    title: "Regulatory Compliance",
    description: "Built-in compliance tools for legal industry standards and regulations",
  },
];

export default function LoginPage() {
  const { login, isAuthenticated, isLoggingIn, isInitialized } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 gradient-legal p-12 flex-col justify-between">
        <div className="animate-slide-in-left">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-legal-navy-foreground">Contoso Legal</h1>
              <p className="text-sm text-legal-navy-foreground/70">Professional Legal Management</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-legal-navy-foreground mb-4 text-balance">
              Streamline Your Legal Practice with Confidence
            </h2>
            <p className="text-legal-navy-foreground/80 text-lg">
              Secure document management, client collaboration, and case organization designed specifically for law firms and legal professionals.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="flex gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-legal-navy-foreground">{feature.title}</h3>
                  <p className="text-sm text-legal-navy-foreground/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div className="relative">
          <div className="absolute -top-20 right-0 w-32 h-32 rounded-full border border-legal-navy-foreground/10" />
          <div className="absolute -top-10 right-10 w-20 h-20 rounded-full border border-legal-navy-foreground/10" />
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">Contoso Legal</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome Back</h2>
            <p className="text-muted-foreground">Access your legal workspace</p>
          </div>

          <div className="space-y-6">
            <Button
              onClick={handleLogin}
              disabled={!isInitialized || isLoggingIn}
              className="w-full h-12 text-base font-medium"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : !isInitialized ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-5 w-5" />
                  Access Legal Workspace
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Protected by enterprise-grade security
            </p>
          </div>

          {/* Additional info */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4" />
                <span>SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
