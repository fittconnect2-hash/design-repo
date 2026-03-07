'use client';

import { notFound, useParams } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task } from '@/lib/definitions';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ArrowLeft, User, Folder, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function TaskPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();

  const taskRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'tasks', params.id);
  }, [firestore, params.id]);

  const { data: task, isLoading } = useDoc<Task>(taskRef);

  if (isLoading) {
    return <TaskPageSkeleton />;
  }

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <Button asChild variant="ghost" className="pl-0">
        <Link href="/tasks" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Task Board
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline font-bold">{task.title}</CardTitle>
          <p className="text-muted-foreground">in project: {task.projectName}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="font-semibold text-foreground">Description</p>
            <p className="text-muted-foreground">{task.description || 'No description provided.'}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
             <div>
                <div className="font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4" /> Assigned To</div>
                <div className="text-muted-foreground ml-6">{task.assignedToName || 'Unassigned'}</div>
            </div>
            <div>
                <div className="font-semibold text-foreground flex items-center gap-2"><Folder className="h-4 w-4" /> Status</div>
                <div className="text-muted-foreground ml-6">{task.status}</div>
            </div>
            <div>
                <div className="font-semibold text-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Last Updated</div>
                <div className="text-muted-foreground ml-6">{task.updatedAt ? format(task.updatedAt.toDate(), 'PP') : 'N/A'}</div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
