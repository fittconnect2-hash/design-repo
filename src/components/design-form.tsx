'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }),
  figmaLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  prototypeUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
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
  const [isSuggestingTags, setSuggestingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSheet = view === 'sheet';
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const defaultValues: DesignFormValues = {
    name: design?.name || '',
    description: design?.description || '',
    imageUrl: design?.imageUrl || '',
    figmaLink: design?.figmaLink || '',
    prototypeUrl: design?.prototypeUrl || '',
    tags: design?.tags?.join(', ') || '',
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

    setIsSubmitting(true);

    const { uid } = auth.currentUser;
    const tagsArray = values.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];

    const baseData = {
      ...values,
      userId: uid,
      tags: tagsArray,
    };

    if (design) {
      // Update existing design
      const designRef = doc(firestore, 'users', uid, 'designProjects', design.id);
      const dataToUpdate = {
        ...baseData,
        updatedAt: serverTimestamp(),
      };
      setDoc(designRef, dataToUpdate, { merge: true })
        .then(() => {
          toast({ title: 'Success', description: 'Design updated successfully.' });
          if (onSuccess) onSuccess();
          router.refresh();
        })
        .catch((error: unknown) => {
          console.error("Update failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Could not save the project.';
          toast({ variant: 'destructive', title: 'Update Failed', description: errorMessage });
        })
        .finally(() => {
          setIsSubmitting(false);
        });

    } else {
      // Create new design
      const collectionRef = collection(firestore, 'users', uid, 'designProjects');
      const newDocRef = doc(collectionRef);
      const dataToCreate = {
        ...baseData,
        id: newDocRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      setDoc(newDocRef, dataToCreate)
        .then(() => {
          toast({ title: 'Success', description: 'Design created successfully.' });
          if (onSuccess) {
            onSuccess();
          }
          router.push(`/designs/${newDocRef.id}`);
        })
        .catch((error: unknown) => {
          console.error("Submission failed:", error);
          const errorMessage = error instanceof Error ? error.message : 'Could not save the project.';
          toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
        })
        .finally(() => {
          setIsSubmitting(false);
        });
    }
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
  const imageUrlValue = form.watch('imageUrl');

  const imagePreview = useMemo(() => {
    if (!imageUrlValue || form.getFieldState('imageUrl').invalid) {
      return null;
    }

    const allowedHosts = [
      'images.unsplash.com',
      'picsum.photos',
      'firebasestorage.googleapis.com',
      'i.imgur.com',
      'placehold.co',
    ];

    try {
      const url = new URL(imageUrlValue);
      if (allowedHosts.includes(url.hostname)) {
        return (
          <div className="relative aspect-video w-full rounded-md overflow-hidden border">
            <Image src={imageUrlValue} alt="Project image preview" fill className="object-cover" />
          </div>
        );
      }
      return (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
          <p className="font-semibold">Cannot show preview for this URL.</p>
          <p className="text-destructive/80 mt-1">The image host is not supported for previews. Please use a direct image link (e.g., ending in .png or .jpg). For sites like prnt.sc, right-click the image and select "Copy Image Address".</p>
        </div>
      );
    } catch (e) {
      // Invalid URL format, let Zod handle the message
      return null;
    }
  }, [imageUrlValue, form]);

  
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
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/your-image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {imageUrlValue && form.getFieldState('imageUrl').invalid === false && (
                <div className="mt-4 space-y-2">
                  <FormLabel>Image Preview</FormLabel>
                  {imagePreview}
                </div>
              )}
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <FormLabel>Tags</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handleSuggestTags} disabled={isSuggestingTags || isSubmitting}>
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
                        <FormItem className="space-y-0">
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
            <div className="flex justify-end gap-4">
              {isSheet ? (
                <SheetClose asChild>
                  <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </SheetClose>
              ) : (
                <Button type="button" variant="outline" asChild disabled={isSubmitting}>
                    <Link href={design ? `/designs/${design.id}` : '/'}>Cancel</Link>
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
