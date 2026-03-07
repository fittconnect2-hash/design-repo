'use client';

import { useMemo, useState, useEffect } from 'react';
import { TaskBoard } from '@/components/task-board';
import { AddTaskButton } from '@/components/add-task-button';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/definitions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);

  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);
  
  const isLoading = isUserLoading || isUserProfileLoading;

  useEffect(() => {
    // When user data is loaded, if they are not an admin, force filter to 'mine'.
    if (!isLoading && !isAdmin) {
      setFilter('mine');
    }
  }, [isLoading, isAdmin]);

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Your project task board.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="task-filter">Show Tasks</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-[180px]" />
            ) : (
              <Select value={filter} onValueChange={(value) => setFilter(value as 'all' | 'mine')} disabled={!isAdmin}>
                <SelectTrigger id="task-filter" className="w-[180px]">
                  <SelectValue placeholder="Select filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" disabled={!isAdmin}>All Tasks</SelectItem>
                  <SelectItem value="mine">My Tasks</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <AddTaskButton />
        </div>
      </div>
      <TaskBoard filter={filter} />
    </div>
  );
}
