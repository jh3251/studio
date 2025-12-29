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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');


  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        toast({
            variant: "destructive",
            title: "Missing fields",
            description: "Please enter both email and password.",
        });
        return;
    }
    setIsSubmitting(true);

    try {
        if (activeTab === 'signin') {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        const authError = error as AuthError;
        let title = 'Authentication Failed';
        let description = authError.message || 'An unexpected error occurred.';

        if (authError.code === 'auth/user-not-found') {
            title = 'Sign-in Failed';
            description = 'No account found with this email. Please sign up instead.';
        } else if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
            title = 'Sign-in Failed';
            description = 'Incorrect password. Please try again.';
        } else if (authError.code === 'auth/email-already-in-use') {
            title = 'Sign-up Failed';
            description = 'This email is already in use. Please sign in instead.';
        }
        
        console.error(`Error during ${activeTab}:`, authError);
        toast({
            variant: "destructive",
            title: title,
            description: description,
        });
    } finally {
        setIsSubmitting(false);
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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
                <form onSubmit={handleSubmit} className="w-full space-y-4 pt-4">
                  <AuthFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      Sign In
                    </Button>
                  </div>
                </form>
            </TabsContent>
            <TabsContent value="signup">
                 <form onSubmit={handleSubmit} className="w-full space-y-4 pt-4">
                  <AuthFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                  <div className="pt-2">
                    <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
                      {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                      Create Account
                    </Button>
                  </div>
                </form>
            </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}


function AuthFields({email, setEmail, password, setPassword}: {email: string, setEmail: (e:string) => void, password: string, setPassword: (p:string)=>void}) {
    return (
        <>
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
        </>
    )
}
