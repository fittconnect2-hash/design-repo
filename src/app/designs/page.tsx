'use client';

import { useMemo } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';

import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Design } from '@/lib/definitions';
import { DesignsTable } from '@/components/designs-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDesignButton } from '@/components/add-design-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function DesignsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}


export default function DesignsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const designsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'users', user.uid, 'designs');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const isLoading = isUserLoading || (user && isLoadingDesigns);

  if (isLoading) {
    return <DesignsPageSkeleton />;
  }
  
  const hasDesigns = designs && designs.length > 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Design Repo</h1>
          <p className="text-muted-foreground">A complete repository of all your designs.</p>
        </div>
        <AddDesignButton buttonText="Add Design" />
      </div>

      {hasDesigns ? (
        <Card>
          <DesignsTable designs={designs || []} />
        </Card>
      ) : (
         <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Designs Yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Get started by adding your first design.</p>
                <AddDesignButton buttonText="Add Design" />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
