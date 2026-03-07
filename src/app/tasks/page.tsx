'use client';

import { TaskBoard } from '@/components/task-board';
import { AddTaskButton } from '@/components/add-task-button';

export default function TasksPage() {
  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">A global task board for the entire team.</p>
        </div>
        <AddTaskButton />
      </div>
      <TaskBoard />
    </div>
  );
}
