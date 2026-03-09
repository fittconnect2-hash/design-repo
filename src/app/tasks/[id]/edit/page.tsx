'use client';

import { TaskForm } from '@/components/task-form';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Task } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function EditTaskSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-8 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}

export default function EditTaskPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();

  const taskRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'tasks', params.id);
  }, [firestore, params.id]);

  const { data: task, isLoading } = useDoc<Task & { id: string }>(taskRef);

  if (isLoading) {
    return <EditTaskSkeleton />;
  }

  if (!task) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/tasks">Tasks</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit Task</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Edit Task</CardTitle>
            </CardHeader>
            <CardContent>
                <TaskForm task={task} view="page" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
