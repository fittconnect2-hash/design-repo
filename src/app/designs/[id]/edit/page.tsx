'use client';

import { DesignForm } from '@/components/design-form';
import { notFound, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Design } from '@/lib/definitions';
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

function EditDesignSkeleton() {
  return (
     <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-8 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
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

export default function EditDesignPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();

  const designRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'designs', params.id);
  }, [firestore, params.id]);

  const { data: design, isLoading: isDesignLoading } = useDoc<Design>(designRef);

  if (isDesignLoading) {
    return <EditDesignSkeleton />;
  }

  if (!design) {
    notFound();
  }

  return (
    <div className="space-y-6">
       <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/designs">Designs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
             <BreadcrumbLink asChild>
              <Link href={`/designs/${params.id}`}>{design.name}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
           <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Edit</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <main className="max-w-2xl mx-auto">
        <DesignForm design={design} view="page" />
      </main>
    </div>
  );
}
