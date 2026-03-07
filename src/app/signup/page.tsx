'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { doc, serverTimestamp, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import type { Invite } from '@/lib/definitions';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [invite, setInvite] = useState<Invite | null>(null);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteId = searchParams.get('invite');

  useEffect(() => {
    async function fetchInvite() {
      if (!inviteId) {
        setIsLoadingInvite(false);
        return;
      }
      
      const inviteRef = doc(firestore, 'invites', inviteId);
      const inviteSnap = await getDoc(inviteRef);

      if (inviteSnap.exists()) {
        const inviteData = inviteSnap.data() as Invite;
        setInvite(inviteData);
        setEmail(inviteData.email);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Invite',
          description: 'This invitation link is invalid or has expired.',
        });
        router.push('/signup');
      }
      setIsLoadingInvite(false);
    }
    fetchInvite();
  }, [inviteId, firestore, router, toast]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = `${firstName} ${lastName}`.trim();
      
      await updateProfile(user, {
        displayName,
      });
      
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        displayName,
        email,
        role: invite?.role || 'Staff Designer', // Use invite role or default
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Delete the invite document after successful signup
      if (inviteId) {
        const inviteRef = doc(firestore, 'invites', inviteId);
        await deleteDoc(inviteRef);
      }

      toast({
        title: 'Account created',
        description: 'You have successfully signed up.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error signing up',
        description: error.message,
      });
    }
  };

  if (isLoadingInvite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Sign Up</CardTitle>
          <CardDescription>
            {invite ? `You've been invited to join! Complete your account setup.` : `Enter your information to create an account`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  placeholder="Max"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  placeholder="Robinson"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!invite}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <div
                  className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create an account
            </Button>
          </form>
          {!invite && (
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline">
                Login
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
