'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { collection, orderBy, query, doc, setDoc } from 'firebase/firestore';
import { PlusCircle } from 'lucide-react';

import { useCollection, useFirestore } from '@/firebase';
import type { Task } from '@/lib/definitions';
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
import { ScrollArea } from './ui/scroll-area';
import { TaskForm } from './task-form';

type TaskStatus = 'Todo' | 'In Progress' | 'Done';

const COLUMNS: TaskStatus[] = ['Todo', 'In Progress', 'Done'];

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
            className="mb-4 p-4 cursor-grab active:cursor-grabbing hover:bg-accent transition-colors"
        >
            <p className="font-semibold">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.projectName}</p>
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

export function TaskBoard() {
  const firestore = useFirestore();
  const [tasks, setTasks] = useState<(Task & { id: string })[]>([]);
  const [selectedTask, setSelectedTask] = useState<(Task & { id: string }) | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAddDesignSheetOpen, setIsAddDesignSheetOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<(Task & { id: string }) | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const tasksQuery = useMemo(() => {
    const collRef = collection(firestore, 'tasks');
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: fetchedTasks, isLoading: isLoadingTasks } = useCollection<Task & { id: string }>(tasksQuery);

  React.useEffect(() => {
    if (fetchedTasks) {
        setTasks(fetchedTasks);
    }
  }, [fetchedTasks]);

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
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status } : t));
        
        // Firestore update
        const taskRef = doc(firestore, 'tasks', taskId);
        try {
            await setDoc(taskRef, { status }, { merge: true });
        } catch (error) {
            // Revert optimistic update on error
            setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, status: taskToMove.status } : t));
            console.error("Failed to update task status:", error);
        }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  if (isLoadingTasks) {
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

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            {selectedTask && (
                <>
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{selectedTask.title}</DialogTitle>
                        <DialogDescription>
                            In project: {selectedTask.projectName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground">
                        <p>{selectedTask.description || 'No description for this task.'}</p>
                    </div>
                    <DialogFooter className="sm:justify-between">
                         <Button onClick={() => {
                            setIsDetailsDialogOpen(false);
                            // timeout to prevent issues with multiple modals/sheets
                            setTimeout(() => setIsAddDesignSheetOpen(true), 150);
                        }}>
                           <PlusCircle className="mr-2 h-4 w-4" /> Add Design Repo
                        </Button>
                        <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
      
      <Sheet open={isAddDesignSheetOpen} onOpenChange={setIsAddDesignSheetOpen}>
          <SheetContent className="p-0 sm:max-w-2xl">
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
        <SheetContent className="p-0 sm:max-w-md">
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
