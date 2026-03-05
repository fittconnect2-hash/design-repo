'use client';

import { getDesigns } from '@/lib/data';
import { DesignsTable } from '@/components/designs-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddDesignButton } from '@/components/add-design-button';
import { UserNav } from '@/components/user-nav';
import { useUser } from '@/firebase';
import { useEffect, useState } from 'react';
import type { Design } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';

function HomePageContent({ designs }: { designs: Design[] }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your Design Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <DesignsTable designs={designs} />
        </CardContent>
      </Card>
    </>
  );
}


export default function Home() {
  const { user, isUserLoading } = useUser();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isUserLoading && user) {
      getDesigns().then(d => {
        setDesigns(d);
        setIsLoading(false);
      });
    }
  }, [isUserLoading, user]);

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
        {isLoading || isUserLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <HomePageContent designs={designs} />
        )}
      </main>
    </div>
  );
}
