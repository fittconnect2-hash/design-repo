'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition, useState } from 'react';
import Link from 'next/link';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { Design } from '@/lib/definitions';
import { suggestDesignTags } from '@/ai/flows/suggest-design-tags-flow';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2 } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  figmaLink: z.string().url({ message: 'Please enter a valid URL.' }),
  prototypeUrl: z.string().url({ message: 'Please enter a valid URL.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }),
  tags: z.string().optional(),
});

type DesignFormValues = z.infer<typeof formSchema>;

interface DesignFormProps {
  design?: Design;
  view?: 'page' | 'sheet';
  onSuccess?: () => void;
}

export function DesignForm({ design, view = 'page', onSuccess }: DesignFormProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isSuggestingTags, setSuggestingTags] = useState(false);
  const isSheet = view === 'sheet';
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const defaultValues = design ? {
    ...design,
    tags: design.tags?.join(', '),
  } : {
    name: '',
    description: '',
    figmaLink: '',
    prototypeUrl: '',
    imageUrl: '',
    tags: '',
  };

  const form = useForm<DesignFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  const onSubmit = (values: DesignFormValues) => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }
    const { uid } = auth.currentUser;
    
    startTransition(() => {
      const tagsArray = values.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];

      if (design) {
        const designRef = doc(firestore, 'users', uid, 'designProjects', design.id);
        const dataToUpdate = {
          ...values,
          tags: tagsArray,
          updatedAt: serverTimestamp(),
        };
        
        setDoc(designRef, dataToUpdate, { merge: true })
          .then(() => {
            toast({ title: 'Success', description: 'Design updated successfully.' });
            if (!isSheet) {
              router.push(`/designs/${design.id}`);
            } else if (onSuccess) {
              onSuccess();
            }
          })
          .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: designRef.path,
              operation: 'update',
              requestResourceData: dataToUpdate,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update design.' });
          });
      } else {
        const collectionRef = collection(firestore, 'users', uid, 'designProjects');
        const dataToCreate = {
          ...values,
          userId: uid,
          tags: tagsArray,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        addDoc(collectionRef, dataToCreate)
          .then(() => {
            toast({ title: 'Success', description: 'Design created successfully.' });
            if (onSuccess) {
              onSuccess();
            }
          })
          .catch(() => {
            const permissionError = new FirestorePermissionError({
              path: collectionRef.path,
              operation: 'create',
              requestResourceData: dataToCreate,
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to create design.' });
          });
      }
    });
  };

  const handleSuggestTags = async () => {
    const name = form.getValues('name');
    const description = form.getValues('description');
    if (!name || !description) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a name and description to suggest tags.',
      });
      return;
    }
    setSuggestingTags(true);
    try {
      const result = await suggestDesignTags({ name, description });
      if (result.tags) {
        form.setValue('tags', result.tags.join(', '), { shouldValidate: true });
        toast({ title: 'AI Success', description: 'Tags have been suggested for you.' });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'AI Error',
        description: 'Failed to suggest tags. Please try again.',
      });
    } finally {
      setSuggestingTags(false);
    }
  };
  
  const tagsValue = form.watch('tags');
  
  const formContent = (
      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., E-commerce Redesign" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your project..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <FormLabel>Tags</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isSuggestingTags}>
                        {isSuggestingTags ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Suggest Tags
                    </Button>
                </div>
                <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input placeholder="e.g., UI, UX, Mobile" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {tagsValue && (
                    <div className="flex flex-wrap gap-2 pt-2">
                    {tagsValue.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                    </div>
                )}
            </div>
            <FormField
              control={form.control}
              name="figmaLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Figma Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://figma.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prototypeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prototype URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://figma.com/proto/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://images.unsplash.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              {isSheet ? (
                <SheetClose asChild>
                  <Button type="button" variant="outline" disabled={isPending}>Cancel</Button>
                </SheetClose>
              ) : (
                <Button type="button" variant="outline" asChild disabled={isPending}>
                    <Link href={design ? `/designs/${design.id}` : '/'}>Cancel</Link>
                </Button>
              )}
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {design ? 'Save Changes' : 'Create Project'}
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
        <CardTitle>{design ? 'Edit Design Project' : 'Add New Design Project'}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
