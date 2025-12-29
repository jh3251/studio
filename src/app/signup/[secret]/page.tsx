'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, AuthError } from 'firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SumbookIcon } from '@/components/icons/sumbook-icon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const SIGNUP_SECRET = 'create-new-user-secret-key';

export default function SignUpPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const secret = params.secret;
  const isSecretValid = secret === SIGNUP_SECRET;

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
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        const authError = error as AuthError;
        let title = 'Sign-up Failed';
        let description = authError.message || 'An unexpected error occurred.';

        if (authError.code === 'auth/email-already-in-use') {
            title = 'Sign-up Failed';
            description = 'This email is already in use. Please sign in instead.';
        }
        
        console.error('Error during sign-up:', authError);
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

            {isSecretValid ? (
                 <div className="w-full">
                    <Card>
                        <CardHeader>
                            <CardTitle>Create New Account</CardTitle>
                            <CardDescription>Fill in the details below to create your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="w-full space-y-4">
                            <AuthFields email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                            <div className="pt-2">
                                <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                                Create Account
                                </Button>
                            </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card className="w-full border-destructive">
                    <CardHeader className="text-center">
                        <CardTitle className="text-destructive">Access Denied</CardTitle>
                        <CardDescription>
                            The sign-up link is invalid or has expired. Please contact the administrator for a valid link.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}
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
