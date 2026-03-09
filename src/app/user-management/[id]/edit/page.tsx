'use client';

import { UserForm } from '@/components/user-form';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/definitions';
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

function EditUserSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-8 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  )
}

export default function EditUserPage() {
  const params = useParams<{ id:string }>();
  const firestore = useFirestore();

  const userRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'users', params.id);
  }, [firestore, params.id]);

  const { data: user, isLoading: isUserLoading } = useDoc<UserProfile & { id: string }>(userRef);

  if (isUserLoading) {
    return <EditUserSkeleton />;
  }

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/user-management">User Management</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{user.displayName}</BreadcrumbPage>
          </BreadcrumbItem>
           <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="max-w-2xl mx-auto">
        <UserForm user={user} view="page" />
      </div>
    </div>
  );
}
