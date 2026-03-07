'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { collection, orderBy, query, doc, setDoc } from 'firebase/firestore';

import { useCollection, useFirestore } from '@/firebase';
import type { Task } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TaskStatus = 'Todo' | 'In Progress' | 'Done';

const COLUMNS: TaskStatus[] = ['Todo', 'In Progress', 'Done'];

function TaskCard({ task }: { task: Task & { id: string } }) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('taskId', task.id);
    };

    return (
        <Card
            draggable
            onDragStart={onDragStart}
            className="mb-4 p-4 cursor-grab active:cursor-grabbing bg-card"
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
