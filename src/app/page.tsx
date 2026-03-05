'use client';

import { DesignsTable } from '@/components/designs-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddDesignButton } from '@/components/add-design-button';
import { UserNav } from '@/components/user-nav';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Design } from '@/lib/definitions';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const designsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'users', user.uid, 'designProjects');
    // Order projects by creation date, descending
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design>(designsQuery);

  const isLoading = isUserLoading || (user && isLoadingDesigns);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <h1 className="text-2xl font-headline font-bold text-primary">DesignDock</h1>
          <div className="flex items-center gap-4">
            <AddDesignButton />
            <UserNav />
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Design Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <DesignsTable designs={designs || []} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
