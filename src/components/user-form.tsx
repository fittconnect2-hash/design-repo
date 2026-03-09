'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const formSchema = z.object({
  displayName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email(),
  role: z.enum(['Admin', 'Staff Designer']),
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  user: UserProfile & { id: string };
  onSuccess?: () => void;
  view?: 'page' | 'sheet';
}

export function UserForm({ user: userToEdit, onSuccess, view = 'sheet' }: UserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const isSheet = view === 'sheet';

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: userToEdit.displayName || '',
      email: userToEdit.email || '',
      role: userToEdit.role || 'Staff Designer',
    },
    mode: 'onChange',
  });
  
  const onSubmit = async (values: UserFormValues) => {
    if (!currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }
    
    if (userToEdit.id === currentUser.uid && values.role !== 'Admin' && userToEdit.role === 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Invalid Action',
        description: "You cannot remove your own 'Admin' role.",
      });
      form.resetField('role');
      return;
    }

    setIsSubmitting(true);

    const userDocRef = doc(firestore, 'users', userToEdit.id);
    const dataToUpdate = {
      displayName: values.displayName,
      role: values.role,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(userDocRef, dataToUpdate, { merge: true });

      if (userToEdit.role !== values.role) {
        const auditLogRef = collection(firestore, 'auditLogs');
        await addDoc(auditLogRef, {
            userId: currentUser.uid,
            userDisplayName: currentUser.displayName,
            userEmail: currentUser.email,
            action: 'UPDATE_ROLE',
            entityType: 'User',
            entityId: userToEdit.id,
            entityName: values.displayName,
            details: `User role for '${values.displayName}' changed from '${userToEdit.role}' to '${values.role}'`,
            timestamp: serverTimestamp(),
        });
      }

      toast({ title: 'Success', description: 'User profile updated successfully.' });
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/user-management');
      }
    } catch (error: unknown) {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: dataToUpdate,
      });
      errorEmitter.emit('permission-error', permissionError);

      const errorMessage = error instanceof Error ? error.message : 'Could not save the profile.';
      toast({ variant: 'destructive', title: 'Operation Failed', description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} disabled />
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
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Staff Designer">Staff Designer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4 pt-4">
          {isSheet ? (
             <SheetClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </SheetClose>
          ) : (
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.back()}>
                Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isSheet) {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  )
}
