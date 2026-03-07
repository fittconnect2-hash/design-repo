'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import type { Task, Project, UserProfile } from '@/lib/definitions';
import { Loader2 } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, orderBy } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  projectId: z.string().min(1, { message: 'Please select a project.' }),
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof formSchema>;

interface TaskFormProps {
  task?: Task & { id: string };
  view?: 'page' | 'sheet';
  onSuccess?: () => void;
}

export function TaskForm({ task, view = 'page', onSuccess }: TaskFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSheet = view === 'sheet';
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const projectsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const usersQuery = useMemo(() => {
    if(!user) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile & { id: string }>(usersQuery);

  const defaultValues: Partial<TaskFormValues> = {
    projectId: task?.projectId || '',
    title: task?.title || '',
    description: task?.description || '',
    assignedToId: task?.assignedToId || '',
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });
  
  const onSubmit = async (values: TaskFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to perform this action.' });
      return;
    }

    setIsSubmitting(true);

    const { uid } = user;
    const selectedProject = projects?.find(p => p.id === values.projectId);
    const projectName = selectedProject?.name || '';
    const assignedUser = users?.find(u => u.id === values.assignedToId);
    const assignedToName = assignedUser?.displayName || '';

    try {
      const taskCollectionRef = collection(firestore, 'tasks');

      if (task) {
        // Update existing task
        const taskRef = doc(taskCollectionRef, task.id);
        const dataToUpdate = {
          ...values,
          projectName,
          assignedToId: values.assignedToId || null,
          assignedToName: assignedToName || null,
          updatedAt: serverTimestamp(),
        };
        await setDoc(taskRef, dataToUpdate, { merge: true });
        toast({ title: 'Success', description: 'Task updated successfully.' });
      } else {
        // Create new task
        const newDocRef = doc(taskCollectionRef);
        const dataToCreate = {
          id: newDocRef.id,
          ...values,
          projectName,
          userId: uid,
          status: 'Todo' as const,
          assignedToId: values.assignedToId || null,
          assignedToName: assignedToName || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(newDocRef, dataToCreate);
        toast({ title: 'Success', description: 'Task created.' });
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: unknown) {
      console.error("Operation failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'Could not save the task.';
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement login page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Assign to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingUsers}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={isLoadingUsers ? "Loading users..." : "Unassigned"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users?.map(user => (
                            <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add more details about the task..." {...field} rows={4} />
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
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => router.back()}>
                    Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {task ? 'Save Changes' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
  );

  return formContent;
}
