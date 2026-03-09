'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Copy, Check, Loader2, Mail, CircleCheck } from 'lucide-react';

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
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';

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
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<{ link: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 0);
    }
  }, [open]);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      role: 'Staff Designer',
    },
    mode: 'onChange',
  });

  const onSubmit = (values: InviteFormValues) => {
    if (!user) {
       toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to create an invite.',
      });
      return;
    }
    setIsSubmitting(true);
    
    const inviteCollectionRef = collection(firestore, 'invites');
    const newDocRef = doc(inviteCollectionRef);
    
    const inviteData = {
      id: newDocRef.id,
      email: values.email,
      role: values.role,
      createdAt: serverTimestamp(),
    };

    setDoc(newDocRef, inviteData)
      .then(async () => {
        setIsSubmitting(false);
        const origin = window.location.origin;
        const link = `${origin}/signup?invite=${newDocRef.id}`;
        setInviteDetails({ link, email: values.email });
        toast({ title: 'Success', description: 'Invitation created.' });

        // Log activity
        const auditLogRef = collection(firestore, 'auditLogs');
        await addDoc(auditLogRef, {
            userId: user.uid,
            userDisplayName: user.displayName,
            userEmail: user.email,
            action: 'INVITE',
            entityType: 'Invite',
            entityId: newDocRef.id,
            entityName: values.email,
            details: `User invited '${values.email}' with role '${values.role}'`,
            timestamp: serverTimestamp(),
        });
      })
      .catch((error: any) => {
        setIsSubmitting(false);
        const permissionError = new FirestorePermissionError({
          path: newDocRef.path,
          operation: 'create',
          requestResourceData: inviteData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Invite Failed',
          description: 'Could not create invitation. You may not have the required permissions.',
        });
      });
  };

  const handleCopyToClipboard = () => {
    if (!inviteDetails) return;
    navigator.clipboard.writeText(inviteDetails.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      form.reset();
      setInviteDetails(null);
    }
    onOpenChange(isOpen);
  };
  
  const generateMailtoLink = () => {
    if (!inviteDetails) return '';
    const subject = encodeURIComponent("You're invited to join DesignDock");
    const body = encodeURIComponent(
      `Hello,\n\nYou have been invited to join our team on DesignDock.\n\nPlease use the following link to sign up:\n${inviteDetails.link}\n\nWe're looking forward to collaborating with you!\n\nBest,\nThe DesignDock Team`
    );
    return `mailto:${inviteDetails.email}?subject=${subject}&body=${body}`;
  };

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add New User</SheetTitle>
          <SheetDescription>
            {inviteDetails
              ? 'Your invite is ready to be sent.'
              : "Create an invitation by providing the user's email and role."}
          </SheetDescription>
        </SheetHeader>
        <div className="py-8">
          {inviteDetails ? (
            <div className="space-y-4 text-center">
              <CircleCheck className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="text-lg font-medium">Invite Link Created!</h3>
              <p className="text-sm text-muted-foreground">
                An invitation for {inviteDetails.email} has been created.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                 <Button asChild className="w-full sm:w-auto">
                    <a href={generateMailtoLink()} target="_blank" rel="noopener noreferrer">
                        <Mail className="mr-2 h-4 w-4" />
                        Email Invite
                    </a>
                </Button>
                <Button variant="outline" onClick={handleCopyToClipboard} className="w-full sm:w-auto">
                    {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? 'Link Copied' : 'Copy Link'}
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
              {inviteDetails ? 'Done' : 'Cancel'}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
