'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    try {
      // For this simplified app, we can use a hardcoded user.
      // In a real app, you would want to securely manage users.
      await signInWithEmailAndPassword(auth, "admin@example.com", "password123");
    } catch (error) {
      console.error('Error signing in:', error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "Please check your credentials and try again.",
      });
      setIsSigningIn(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="flex w-full max-w-sm flex-col items-center space-y-6">
        <div className="flex items-center gap-3 text-center">
            <div className="flex items-center justify-center p-2 rounded-lg bg-primary text-primary-foreground">
                <Scale className="w-8 h-8" />
            </div>
            <h1 className="text-4xl font-bold font-headline text-primary">BalanceWise</h1>
        </div>

        <p className="text-center text-lg text-muted-foreground">
          Welcome! Sign in to manage your personal finances.
        </p>
        
        <form onSubmit={handleSignIn} className="w-full space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              placeholder="password123"
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={isSigningIn}
              size="lg"
            >
              {isSigningIn ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
