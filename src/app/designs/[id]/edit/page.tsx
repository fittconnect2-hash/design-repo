'use client';

import { DesignForm } from '@/components/design-form';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Design } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

function EditDesignSkeleton() {
  return (
     <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Skeleton className="h-8 w-32" />
        </div>
      </header>
      <main className="container mx-auto max-w-2xl p-4 md:p-6">
        <div className="space-y-8">
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
      </main>
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Button asChild variant="ghost" className="pl-0">
            <Link href={`/designs/${params.id}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl p-4 md:p-6">
        <DesignForm design={design} />
      </main>
    </div>
  );
}
