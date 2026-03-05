'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
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
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  figmaLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  prototypeUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  image: z.any(),
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const isSheet = view === 'sheet';
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const defaultValues: DesignFormValues = {
    name: design?.name || '',
    description: design?.description || '',
    figmaLink: design?.figmaLink || '',
    prototypeUrl: design?.prototypeUrl || '',
    image: undefined,
    tags: design?.tags?.join(', ') || '',
  };

  const form = useForm<DesignFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  const imageField = form.register('image');

  const onSubmit = async (values: DesignFormValues) => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const { uid } = auth.currentUser;
    const imageFile = values.image?.[0];
    const existingImageUrl = design?.imageUrl;

    try {
      let finalImageUrl = existingImageUrl;

      if (imageFile instanceof File) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('userId', uid);

        setUploadProgress(50);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const contentType = response.headers.get('content-type');
        if (!response.ok) {
          let errorDetails = 'Image upload failed on the server.';
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || errorDetails;
          } else {
            errorDetails = 'Server returned an unexpected error. Please check server logs.';
          }
          throw new Error(errorDetails);
        }
        
        const result = await response.json();
        finalImageUrl = result.imageUrl;
        setUploadProgress(100);
      }

      if (!finalImageUrl) {
        throw new Error('A project image is required.');
      }

      const tagsArray = values.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];
      const { image, ...restOfValues } = values;

      const designData = {
        ...restOfValues,
        userId: uid,
        imageUrl: finalImageUrl,
        tags: tagsArray,
        updatedAt: serverTimestamp(),
      };

      if (design) {
        const designRef = doc(firestore, 'users', uid, 'designProjects', design.id);
        await setDoc(designRef, designData, { merge: true });
        toast({ title: 'Success', description: 'Design updated successfully.' });
      } else {
        const collectionRef = collection(firestore, 'users', uid, 'designProjects');
        await addDoc(collectionRef, { ...designData, createdAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Design created successfully.' });
        form.reset(defaultValues);
      }

      if (onSuccess) onSuccess();
      router.refresh();

    } catch (error: unknown) {
      console.error("Submission failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the project.';
      toast({ variant: 'destructive', title: 'Submission Failed', description: errorMessage });
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
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
            <FormItem>
              <FormLabel>Project Image</FormLabel>
              <FormControl>
                <Input 
                  type="file" 
                  accept="image/*"
                  {...imageField}
                />
              </FormControl>
              {uploadProgress !== null && <Progress value={uploadProgress} className="mt-2" />}
              {!form.watch('image')?.[0] && design?.imageUrl && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Current Image:</p>
                  <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                    <Image src={design.imageUrl} alt="Current project image" fill className="object-cover" />
                  </div>
                </div>
              )}
              <FormMessage>{form.formState.errors.image?.message as React.ReactNode}</FormMessage>
            </FormItem>
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
