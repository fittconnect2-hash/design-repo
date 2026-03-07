'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, orderBy, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PlusCircle, Loader2, User, Share2 } from 'lucide-react';

import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import type { Task, Project, UserProfile, Notification } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DesignForm } from './design-form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskForm } from './task-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';

type TaskStatus = 'Todo' | 'In Progress' | 'Done';

const COLUMNS: TaskStatus[] = ['Todo', 'In Progress', 'Done'];

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
};

function TaskCard({ task, onTaskClick, onTaskDoubleClick }: { task: Task & { id: string }, onTaskClick: (task: Task & { id: string }) => void, onTaskDoubleClick: (task: Task & { id: string }) => void }) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('taskId', task.id);
        e.stopPropagation();
    };

    return (
        <Card
            draggable
            onDragStart={onDragStart}
            onClick={() => onTaskClick(task)}
            onDoubleClick={() => onTaskDoubleClick(task)}
            className="mb-4 p-4 cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.projectName}</p>
                </div>
                {task.assignedToName && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{getInitials(task.assignedToName)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Assigned to {task.assignedToName}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </Card>
    );
}

const taskDetailSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Please select a project.'),
  assignedToId: z.string().optional(),
});
type TaskDetailValues = z.infer<typeof taskDetailSchema>;


function TaskBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map(col => (
             <Card key={col} className="bg-muted/50">
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        ))}
    </div>
  );
}

export function TaskBoard() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [tasks, setTasks] = useState<(Task & { id: string })[]>([]);
  const [selectedTask, setSelectedTask] = useState<(Task & { id: string }) | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddDesignSheetOpen, setIsAddDesignSheetOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<(Task & { id: string }) | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const { toast } = useToast();

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: currentUserProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || currentUserProfile?.role === 'Admin', [isSuperAdminByEmail, currentUserProfile]);

  const tasksQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'tasks');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);


  const { data: fetchedTasks, isLoading: isLoadingTasks } = useCollection<Task & { id: string }>(tasksQuery);

  const projectsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const usersQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile & { id: string }>(usersQuery);

  const form = useForm<TaskDetailValues>({
    resolver: zodResolver(taskDetailSchema),
  });

  useEffect(() => {
    if (fetchedTasks) {
        setTasks(fetchedTasks);
    } else {
      setTasks([]);
    }
  }, [fetchedTasks]);

  useEffect(() => {
    if (selectedTask) {
        form.reset({
            title: selectedTask.title,
            description: selectedTask.description || '',
            projectId: selectedTask.projectId,
            assignedToId: selectedTask.assignedToId || '_unassigned',
        });
    }
  }, [selectedTask, form]);
  
  const onDetailSubmit = async (values: TaskDetailValues) => {
    if (!selectedTask) return;

    const taskRef = doc(firestore, 'tasks', selectedTask.id);
    const selectedProject = projects?.find(p => p.id === values.projectId);
    const assignedToIdValue = values.assignedToId === '_unassigned' ? null : values.assignedToId || null;
    const assignedUser = users?.find(u => u.id === assignedToIdValue);
    const assignedToName = assignedUser?.displayName || '';

    try {
        await setDoc(taskRef, {
            ...values,
            projectName: selectedProject?.name || '',
            assignedToId: assignedToIdValue,
            assignedToName: assignedToName,
            updatedAt: serverTimestamp(),
        }, { merge: true });
        
        const optimisticUpdate = {
            ...values,
            projectName: selectedProject?.name || '',
            assignedToId: assignedToIdValue,
            assignedToName: assignedToName,
        };
        
        setTasks(prevTasks => prevTasks.map(t => t.id === selectedTask.id ? { ...t, ...optimisticUpdate } as Task & {id: string} : t));
        setSelectedTask(prev => prev ? { ...prev, ...optimisticUpdate } as Task & {id: string} : null);

        setIsEditingDetails(false);
    } catch (error) {
        console.error("Failed to update task", error);
    }
  };


  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, (Task & { id: string })[]> = {
      'Todo': [],
      'In Progress': [],
      'Done': [],
    };
    if (tasks) {
        tasks.forEach(task => {
          if (task.status && grouped[task.status]) {
            grouped[task.status].push(task);
          }
        });
    }
    return grouped;
  }, [tasks]);

  const handleTaskClick = (task: Task & { id: string }) => {
    setSelectedTask(task);
    setIsDetailsDialogOpen(true);
  };
  
  const handleTaskDoubleClick = (task: Task & { id: string }) => {
    setTaskToEdit(task);
    setIsEditSheetOpen(true);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (taskToMove && taskToMove.status !== status) {
        // Optimistic update
        const optimisticUpdatedAt = new Date();
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status, updatedAt: { toDate: () => optimisticUpdatedAt } } as Task & { id: string } : t);
        setTasks(updatedTasks);
        
        // Firestore update
        const taskRef = doc(firestore, 'tasks', taskId);
        try {
            await setDoc(taskRef, { status, updatedAt: serverTimestamp() }, { merge: true });

            // Send notification if a non-admin user updates a task
            if (currentUserProfile && users) {
                // Find all admins (by role or super admin email)
                const admins = users.filter(u => u.role === 'Admin' || u.email === 'fittconnect2@gmail.com');
                const uniqueAdmins = [...new Map(admins.map(item => [item.id, item])).values()];
                
                if (!isAdmin) {
                    const notificationPromises = uniqueAdmins.map(adminUser => {
                        if (!adminUser.id) return null;
                        const notificationRef = doc(collection(firestore, 'users', adminUser.id, 'notifications'));
                        const notificationData: Omit<Notification, 'createdAt'> = {
                            id: notificationRef.id,
                            userId: adminUser.id,
                            title: 'Task Updated',
                            message: `'${taskToMove.title}' was moved to ${status} by ${currentUserProfile.displayName}.`,
                            link: `/tasks/${taskToMove.id}`,
                            isRead: false,
                        };
                        return setDoc(notificationRef, { ...notificationData, createdAt: serverTimestamp() });
                    }).filter(Boolean);
                    
                    if (notificationPromises.length > 0) {
                      await Promise.all(notificationPromises).catch(err => console.error("Error creating notifications:", err));
                    }
                }
            }

        } catch (error) {
            // Revert optimistic update on error
            setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status: taskToMove.status, updatedAt: taskToMove.updatedAt } : t));
            console.error("Failed to update task status:", error);
        }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    setIsDetailsDialogOpen(isOpen);
    if (!isOpen) {
      setIsEditingDetails(false); // Reset edit state on close
    }
  };
  
  const handleShareTask = (taskId: string) => {
    const url = `${window.location.origin}/tasks/${taskId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'The task link has been copied to your clipboard.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link.',
      });
    });
  };


  if (isLoadingTasks || isUserProfileLoading) {
    return <TaskBoardSkeleton />;
  }

  return (
    <>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {COLUMNS.map(status => (
          <div key={status} onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver}>
              <Card className="bg-muted/50 h-full">
                  <CardHeader>
                      <CardTitle className="text-lg">{status} ({tasksByColumn[status]?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 min-h-[200px]">
                      {tasksByColumn[status] && tasksByColumn[status].map(task => (
                          <TaskCard key={task.id} task={task} onTaskClick={handleTaskClick} onTaskDoubleClick={handleTaskDoubleClick} />
                      ))}
                  </CardContent>
              </Card>
          </div>
        ))}
      </div>

      <Dialog open={isDetailsDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
            {selectedTask && (
              !isEditingDetails ? (
                <div onClick={() => setIsEditingDetails(true)} className="group cursor-pointer">
                    <DialogHeader>
                        <DialogTitle className="text-2xl group-hover:text-primary">{selectedTask.title}</DialogTitle>
                        <DialogDescription className="group-hover:text-primary/80">
                            In project: {selectedTask.projectName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground min-h-[4rem] group-hover:text-primary/80">
                            {selectedTask.description || 'No description provided. Click to add one.'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary/80">
                            <User className="h-4 w-4" />
                            <span>{selectedTask.assignedToName ? `Assigned to ${selectedTask.assignedToName}` : 'Unassigned'}</span>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-between items-center gap-2">
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="outline" onClick={(e) => {
                                e.stopPropagation();
                                if (selectedTask) handleShareTask(selectedTask.id);
                            }}>
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                            <Button onClick={(e) => {
                                e.stopPropagation();
                                setIsDetailsDialogOpen(false);
                                setTimeout(() => setIsAddDesignSheetOpen(true), 150);
                            }}>
                               <PlusCircle className="mr-2 h-4 w-4" /> Add Design Repo
                            </Button>
                        </div>
                        <Button variant="outline" onClick={(e) => { e.stopPropagation(); handleDialogClose(false)}}>Close</Button>
                    </DialogFooter>
                </div>
              ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onDetailSubmit)} className="space-y-4">
                        <DialogHeader>
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="text-2xl font-bold h-auto p-0 border-0 shadow-none focus-visible:ring-0" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </DialogHeader>
                        
                        <div className="space-y-4">
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
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Add a description..." {...field} />
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
                                        <SelectItem value="_unassigned">Unassigned</SelectItem>
                                        {users?.map(user => (
                                            <SelectItem key={user.id} value={user.id}>{user.displayName}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditingDetails(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
              )
            )}
        </DialogContent>
      </Dialog>
      
      <Sheet open={isAddDesignSheetOpen} onOpenChange={setIsAddDesignSheetOpen}>
          <SheetContent className="p-0 sm:max-w-2xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
            <SheetHeader className="p-6 pb-4">
              <SheetTitle>Add New Design</SheetTitle>
              <SheetDescription>
                Fill out the form below to add a new design. It will be associated with the project '{selectedTask?.projectName}'.
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-6.5rem)]">
              <div className="px-6 pb-6">
                  <DesignForm
                      view="sheet"
                      onSuccess={() => setIsAddDesignSheetOpen(false)}
                      defaultProjectId={selectedTask?.projectId}
                  />
              </div>
            </ScrollArea>
          </SheetContent>
      </Sheet>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="p-0 sm:max-w-md data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <SheetHeader className="p-6 pb-4">
            <SheetTitle>Edit Task</SheetTitle>
            <SheetDescription>
              Make changes to your task here. Click save when you're done.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-6.5rem)]">
            <div className="px-6 pb-6">
              {taskToEdit && (
                <TaskForm
                  task={taskToEdit}
                  view="sheet"
                  onSuccess={() => setIsEditSheetOpen(false)}
                />
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
