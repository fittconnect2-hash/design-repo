'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

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
import type { Project } from '@/lib/definitions';
import { Loader2, CalendarIcon } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, Timestamp, addDoc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from './ui/calendar';


const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type ProjectFormValues = z.infer<typeof formSchema>;

interface ProjectFormProps {
  project?: Project & { id: string };
  view?: 'page' | 'sheet';
  onSuccess?: () => void;
}

export function ProjectForm({ project, view = 'page', onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSheet = view === 'sheet';
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const defaultValues: Partial<ProjectFormValues> = {
    name: project?.name || '',
    description: project?.description || '',
    startDate: project?.startDate?.toDate(),
    endDate: project?.endDate?.toDate(),
  };

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  const onSubmit = async (values: ProjectFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }

    setIsSubmitting(true);
    const { uid } = user;

    const dataPayload = {
      userId: uid,
      name: values.name,
      description: values.description,
      startDate: values.startDate ? Timestamp.fromDate(values.startDate) : null,
      endDate: values.endDate ? Timestamp.fromDate(values.endDate) : null,
      updatedAt: serverTimestamp(),
    };

    try {
      const projectCollectionRef = collection(firestore, 'projects');
      const auditLogRef = collection(firestore, 'auditLogs');
      
      if (project) {
        // Update existing project
        const projectRef = doc(projectCollectionRef, project.id);
        await setDoc(projectRef, dataPayload, { merge: true });

        await addDoc(auditLogRef, {
            userId: uid,
            userDisplayName: user.displayName,
            userEmail: user.email,
            action: 'UPDATE',
            entityType: 'Project',
            entityId: project.id,
            entityName: values.name,
            details: `User updated project '${values.name}'`,
            timestamp: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'Project updated successfully.' });
      } else {
        // Create new project
        const newDocRef = doc(projectCollectionRef);
        await setDoc(newDocRef, {
          ...dataPayload,
          createdAt: serverTimestamp(),
        });

        await addDoc(auditLogRef, {
            userId: uid,
            userDisplayName: user.displayName,
            userEmail: user.email,
            action: 'CREATE',
            entityType: 'Project',
            entityId: newDocRef.id,
            entityName: values.name,
            details: `User created project '${values.name}'`,
            timestamp: serverTimestamp(),
        });

        toast({ title: 'Success', description: 'Project created.' });
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/projects');
      }

    } catch (error: unknown) {
      console.error("Operation failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the project.';
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Marketing Website Redesign" {...field} />
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
                    <Textarea placeholder="Describe the project..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                form.getValues('endDate') ? date > form.getValues('endDate')! : false
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                                date < form.getValues('startDate')!
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <div className="flex justify-end gap-4">
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
                {project ? 'Save Changes' : 'Create Project'}
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
        <CardTitle>{project ? 'Edit Project' : 'Add New Project'}</CardTitle>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
