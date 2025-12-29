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
      // First, try to sign in.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        // If user does not exist, this might be the very first sign-in attempt
        // for an admin user. We'll create the account.
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const newUser = userCredential.user;
            
            // IMPORTANT: Assign 'admin' role to the first user.
            // In a real app, you'd have a more secure way to assign admins.
            // For this prototype, we assume the first person to sign up is the admin.
            const roleRef = doc(firestore, 'user_roles', newUser.uid);
            await setDoc(roleRef, { role: 'admin', uid: newUser.uid });

        } catch (createError) {
            const createAuthError = createError as AuthError;
            console.error('Error creating user:', createAuthError);
            toast({
                variant: "destructive",
                title: "Sign-up Failed",
                description: createAuthError.message || "Could not create a new account.",
            });
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
    // Let the onAuthStateChanged listener and AppContext handle the redirect and role logic.
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
