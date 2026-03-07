'use client';

import { useState } from 'react';
import { AddTaskButton } from '@/components/add-task-button';
import { TaskBoard } from '@/components/task-board';
import { useUser } from '@/firebase';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TasksPage() {
  const { user } = useUser();
  const [taskFilter, setTaskFilter] = useState('all');

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">A global task board for the entire team.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="task-filter">Show Tasks</Label>
            <Select value={taskFilter} onValueChange={setTaskFilter}>
              <SelectTrigger id="task-filter">
                <SelectValue placeholder="Select filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="mine">Assigned to Me</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AddTaskButton />
        </div>
      </div>
      <TaskBoard filter={taskFilter} userId={user?.uid} />
    </div>
  );
}
