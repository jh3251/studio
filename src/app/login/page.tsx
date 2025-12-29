'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SumbookIcon } from '@/components/icons/sumbook-icon';

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
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
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please enter both email and password.",
        });
        return;
    }
    setIsSigningIn(true);

    try {
      // First, try to sign in. This handles existing admins and store users.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as AuthError;

      // If the user doesn't exist, we'll try to create them.
      // This is the flow for creating the very first admin user.
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            
            // If the user's email is 'admin@example.com', explicitly make them an admin.
            // Otherwise, this flow is only for the first admin, not for creating store users.
            if (email.toLowerCase() === 'admin@example.com') {
                const roleRef = doc(firestore, 'user_roles', newUser.uid);
                await setDoc(roleRef, { role: 'admin', uid: newUser.uid });
            } else {
                // If it's not the designated admin email, we assume it's a store user,
                // but store users should be created via the admin's 'Stores' page, not here.
                // So, we show an error.
                throw new Error("This account does not exist. Store users must be created by an administrator.");
            }
        } catch (createError: any) {
            console.error('Error during sign-up attempt:', createError);
            toast({
                variant: "destructive",
                title: "Sign-up Failed",
                description: createError.message || "Could not create a new account. Only the primary admin can sign up here.",
            });
        } finally {
             setIsSigningIn(false);
        }
      } else {
        // Handle other sign-in errors
        console.error('Error signing in:', authError);
        toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: authError.message || "An unexpected error occurred.",
        });
        setIsSigningIn(false);
      }
    }
    // Don't set isSigningIn to false here; let the redirect handle it.
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
                <SumbookIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold font-headline text-primary">SumBook</h1>
        </div>

        <p className="text-center text-lg text-muted-foreground">
          Welcome! Sign in to manage your finances.
        </p>
        
        <form onSubmit={handleSignIn} className="w-full space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
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
              placeholder="••••••••"
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
