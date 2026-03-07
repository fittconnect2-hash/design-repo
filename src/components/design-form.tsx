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
import type { Design, Project } from '@/lib/definitions';
import { suggestDesignTags } from '@/ai/flows/suggest-design-tags-flow';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2 } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }),
  figmaLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  prototypeUrl: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  tags: z.string().optional(),
});

type DesignFormValues = z.infer<typeof formSchema>;

interface DesignFormProps {
  design?: Design & { id: string };
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

  const projectsQuery = useMemo(() => {
    if (!auth.currentUser) return null;
    const collRef = collection(firestore, 'users', auth.currentUser.uid, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore, auth.currentUser]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const defaultValues: Partial<DesignFormValues> = {
    projectId: design?.projectId || '',
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
  
  const onSubmit = async (values: DesignFormValues) => {
    if (!auth.currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }

    setIsSubmitting(true);

    const { uid } = auth.currentUser;
    const tagsArray = values.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];
    
    const selectedProject = projects?.find(p => p.id === values.projectId);
    const projectName = selectedProject?.name || '';

    try {
      const designCollectionRef = collection(firestore, 'users', uid, 'designs');

      if (design) {
        // Update existing design
        let newVersion: string;
        const currentVersion = design.version;

        if (currentVersion && typeof currentVersion === 'string' && currentVersion.includes('.')) {
            const versionParts = currentVersion.split('.').map(part => parseInt(part, 10));
            const major = versionParts[0];
            const minor = versionParts[1];

            if (!isNaN(major) && !isNaN(minor)) {
                newVersion = `${major}.${minor + 1}`;
            } else {
                newVersion = '1.0';
            }
        } else {
            newVersion = '1.0';
        }

        const designRef = doc(designCollectionRef, design.id);
        const dataToUpdate = {
          ...values,
          projectName,
          tags: tagsArray,
          userId: uid,
          version: newVersion,
          updatedAt: serverTimestamp(),
        };
        await setDoc(designRef, dataToUpdate, { merge: true });
        toast({ title: 'Success', description: 'Design updated successfully.' });
        
      } else {
        // Create new design
        const newDocRef = doc(designCollectionRef);
        const dataToCreate = {
          ...values,
          projectName,
          userId: uid,
          tags: tagsArray,
          version: '1.0',
          isPublic: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, dataToCreate);
        toast({ title: 'Success', description: 'Design created.' });
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error("Operation failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the design.';
      toast({ variant: 'destructive', title: 'Operation Failed', description: errorMessage });
    } finally {
      setIsSubmitting(false);
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
      return null;
    }
  }, [imageUrlValue, form]);

  
  const formContent = (
      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingProjects}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingProjects ? "Loading projects..." : "Select a project"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projects?.map(project => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Design Name</FormLabel>
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
                    <Textarea placeholder="Describe your design..." {...field} rows={4} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Image URL</FormLabel>
                    <Link href="https://uploadimgur.com/" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">
                      Upload to Imgur
                    </Link>
                  </div>
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
                    <Link href={design ? `/designs/${design.id}` : '/projects'}>Cancel</Link>
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {design ? 'Save Changes' : 'Create Design'}
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
        <CardTitle>{design ? 'Edit Design' : 'Add New Design'}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
