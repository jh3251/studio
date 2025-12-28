'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';

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
    const adminEmail = "admin@example.com";
    const adminPassword = "password123";

    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (error) {
        const authError = error as AuthError;
        // If the user doesn't exist, create it.
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            } catch (createError) {
                console.error('Error creating user:', createError);
                toast({
                    variant: "destructive",
                    title: "Sign-in Failed",
                    description: "Could not create the necessary user account.",
                });
                setIsSigningIn(false);
            }
        } else {
            console.error('Error signing in:', error);
            toast({
                variant: "destructive",
                title: "Sign-in Failed",
                description: "Please check your credentials and try again.",
            });
            setIsSigningIn(false);
        }
    }
    // Let the onAuthStateChanged listener handle the redirect.
    // The isSigningIn state will be reset by the useEffect or if an error occurs.
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
            <h1 className="text-4xl font-bold font-headline text-primary">SumBook</h1>
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
