'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SumbookIcon } from '@/components/icons/sumbook-icon';
import { collection, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

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
        const checkStores = async () => {
            const storesRef = collection(firestore, `users/${user.uid}/stores`);
            const storeSnap = await getDocs(storesRef);
            if (storeSnap.empty) {
                router.push('/stores');
            } else {
                router.push('/dashboard');
            }
        };
        checkStores();
    }
  }, [user, isUserLoading, router, firestore]);

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
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
        try {
          // If user doesn't exist, create a new account.
          await createUserWithEmailAndPassword(auth, email, password);
        } catch (createError: any) {
            console.error('Error during sign-up attempt:', createError);
            toast({
                variant: "destructive",
                title: "Sign-up Failed",
                description: createError.message || "Could not create a new account.",
            });
             setIsSigningIn(false);
        }
      } else {
        console.error('Error signing in:', authError);
        toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: authError.message || "An unexpected error occurred.",
        });
        setIsSigningIn(false);
      }
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
                <SumbookIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold font-headline text-primary">SumBook</h1>
        </div>

        <p className="text-center text-lg text-muted-foreground">
          Welcome! Sign in or sign up to manage your finances.
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
              Sign In / Sign Up
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
