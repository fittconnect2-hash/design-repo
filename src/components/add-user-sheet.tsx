'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  role: z.enum(['Admin', 'Staff Designer']),
});

type InviteFormValues = z.infer<typeof formSchema>;

interface AddUserSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddUserSheet({ open, onOpenChange }: AddUserSheetProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'Staff Designer',
    },
    mode: 'onChange',
  });

  const onSubmit = async (values: InviteFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const inviteCollectionRef = collection(firestore, 'invites');
      const newDocRef = await addDoc(inviteCollectionRef, {
        email: values.email,
        role: values.role,
        createdAt: serverTimestamp(),
      });
      const origin = window.location.origin;
      setInviteLink(`${origin}/signup?invite=${newDocRef.id}`);
      toast({ title: 'Success', description: 'Invitation created.' });
    } catch (error) {
      console.error('Failed to create invite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create invitation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      form.reset();
      setInviteLink(null);
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add New User</SheetTitle>
          <SheetDescription>
            {inviteLink
              ? 'Share this unique link with the user to complete their registration.'
              : 'Create an invitation by providing the user\'s email and role.'}
          </SheetDescription>
        </SheetHeader>
        <div className="py-8">
          {inviteLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The user must sign up using this link to be added to your workspace with the assigned role.
              </p>
              <div className="flex items-center space-x-2">
                <Input value={inviteLink} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="new.user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Staff Designer">Staff Designer</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Invite Link
                    </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">
              {inviteLink ? 'Done' : 'Cancel'}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
