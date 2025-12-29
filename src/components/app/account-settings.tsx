'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload } from 'lucide-react';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import React, { useRef, useState } from 'react';

const profileSchema = z.object({
  displayName: z.string().min(2, { message: 'Display name must be at least 2 characters.' }).optional(),
  photoURL: z.string().optional(),
});

const emailSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  currentPasswordForEmail: z.string().min(1, { message: 'Current password is required.' }),
});

const passwordSchema = z.object({
  currentPasswordForPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export function AccountSettings() {
  const { user } = useUser();
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
      photoURL: user?.photoURL || '',
    },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user?.email || '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });
  
  const getInitials = (name?: string | null) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('');
  };

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error("User not available for re-authentication.");
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    try {
      await updateProfile(user, {
        displayName: data.displayName,
        // photoURL is handled via file upload now, this field is just for display
      });
      toast({ title: 'Profile Updated', description: 'Your display name has been successfully updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) {
      return;
    }
    const file = event.target.files[0];
    setAvatarPreview(URL.createObjectURL(file));
    setIsUploading(true);

    try {
      const storage = getStorage(firebaseApp);
      const avatarRef = storageRef(storage, `avatars/${user.uid}/${file.name}`);
      
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await updateProfile(user, { photoURL: downloadURL });
      profileForm.setValue('photoURL', downloadURL);
      
      toast({ title: 'Avatar Updated', description: 'Your new avatar has been saved.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: error.message || 'Could not upload your new avatar.',
      });
      setAvatarPreview(null); // Revert preview on failure
    } finally {
      setIsUploading(false);
    }
  };

  const onEmailSubmit = async (data: EmailFormValues) => {
    if (!user) return;
    try {
      await reauthenticate(data.currentPasswordForEmail);
      await updateEmail(user, data.email);
      emailForm.reset({ ...data, currentPasswordForEmail: '' });
      toast({ title: 'Email Updated', description: 'Your email address has been successfully updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating email',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return;
    try {
      await reauthenticate(data.currentPasswordForPassword);
      await updatePassword(user, data.newPassword);
      passwordForm.reset({ currentPasswordForPassword: '', newPassword: '', confirmPassword: '' });
      toast({ title: 'Password Updated', description: 'Your password has been successfully updated.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating password',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };
  
  const watchedPhotoUrl = profileForm.watch('photoURL');
  const displayAvatar = avatarPreview || watchedPhotoUrl || user?.photoURL;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Update Profile</CardTitle>
          <CardDescription>Manage your public profile information.</CardDescription>
        </CardHeader>
        <CardContent>
           <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
               <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={displayAvatar || undefined} />
                    <AvatarFallback className="text-3xl">{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
                <Input
                  type="file"
                  accept="image/png, image/jpeg, image/gif"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <Upload className="mr-2 h-4 w-4" />
                  Change Avatar
                </Button>
              </div>

              <FormField
                control={profileForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={profileForm.formState.isSubmitting || isUploading}>
                {profileForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Profile
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Update Email</CardTitle>
          <CardDescription>Change the email address for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="new.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={emailForm.control}
                name="currentPasswordForEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={emailForm.formState.isSubmitting}>
                {emailForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Email
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password. Choose a strong one!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPasswordForPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
