'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DesignsTable } from '@/components/designs-table';
import type { Design } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

function SharePageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function SharePage() {
  const params = useParams<{ userId: string }>();
  const firestore = useFirestore();
  const userId = params.userId;

  const designsQuery = useMemo(() => {
    if (!userId) return null;
    const collRef = collection(firestore, 'users', userId, 'designs');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, userId]);

  const { data: designs, isLoading } = useCollection<Design & { id: string }>(designsQuery);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Shared Designs</h1>
            <p className="text-muted-foreground mt-1">A publicly shared collection of designs.</p>
        </header>
        <main>
          {isLoading ? (
            <SharePageSkeleton />
          ) : designs && designs.length > 0 ? (
            <Card>
              <DesignsTable designs={designs} isPublic={true} />
            </Card>
          ) : (
             <Card className="flex flex-col items-center justify-center py-20">
                <h2 className="text-2xl font-semibold">No Designs Found</h2>
                <p className="text-muted-foreground mt-2">This user hasn't shared any designs yet.</p>
            </Card>
          )}
        </main>
         <footer className="text-center mt-10 text-sm text-muted-foreground">
            <p>Powered by DesignDock</p>
        </footer>
      </div>
    </div>
  );
}
