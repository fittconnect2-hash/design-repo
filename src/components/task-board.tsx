'use client';

import * as React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, orderBy, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import type { Task, UserProfile, Notification } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';

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

function TaskCard({ task }: { task: Task & { id: string } }) {
    const router = useRouter();
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('taskId', task.id);
        e.stopPropagation();
    };

    const handleClick = () => {
        router.push(`/tasks/${task.id}`);
    }

    return (
        <Card
            draggable
            onDragStart={onDragStart}
            onClick={handleClick}
            className="mb-4 p-4 cursor-pointer active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
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

interface TaskBoardProps {
  filter: string;
  userId?: string;
}

export function TaskBoard({ filter, userId }: TaskBoardProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [tasks, setTasks] = useState<(Task & { id: string })[]>([]);

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: currentUserProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || currentUserProfile?.role === 'Admin', [isSuperAdminByEmail, currentUserProfile]);

  const tasksQuery = useMemo(() => {
    const collRef = collection(firestore, 'tasks');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore]);


  const { data: fetchedTasks, isLoading: isLoadingTasks } = useCollection<Task & { id: string }>(tasksQuery);

  const usersQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, user]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile & { id: string }>(usersQuery);

  useEffect(() => {
    if (fetchedTasks) {
        setTasks(fetchedTasks);
    } else {
      setTasks([]);
    }
  }, [fetchedTasks]);
  
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    if (filter === 'mine' && userId) {
      return tasks.filter(task => task.assignedToId === userId);
    }
    return tasks;
  }, [tasks, filter, userId]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, (Task & { id: string })[]> = {
      'Todo': [],
      'In Progress': [],
      'Done': [],
    };
    if (filteredTasks) {
        filteredTasks.forEach(task => {
          if (task.status && grouped[task.status]) {
            grouped[task.status].push(task);
          }
        });
    }
    return grouped;
  }, [filteredTasks]);

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

  if (isLoadingTasks || isUserProfileLoading || isLoadingUsers) {
    return <TaskBoardSkeleton />;
  }

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {COLUMNS.map(status => (
            <div key={status} onDrop={(e) => handleDrop(e, status)} onDragOver={handleDragOver}>
                <Card className="bg-muted/50 h-full">
                    <CardHeader>
                        <CardTitle className="text-lg">{status} ({tasksByColumn[status]?.length || 0})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-h-[200px]">
                        {tasksByColumn[status] && tasksByColumn[status].map(task => (
                            <TaskCard key={task.id} task={task} />
                        ))}
                    </CardContent>
                </Card>
            </div>
        ))}
    </div>
  );
}
