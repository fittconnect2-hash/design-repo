'use client';

import { DesignsTable } from '@/components/designs-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddDesignButton } from '@/components/add-design-button';
import { UserNav } from '@/components/user-nav';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Design } from '@/lib/definitions';
import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const designsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'users', user.uid, 'designProjects');
    return query(collRef, orderBy('createdAt', 'desc'));
  }, [firestore, user]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const isLoading = isUserLoading || (user && isLoadingDesigns);

  const groupedDesigns = useMemo(() => {
    if (!designs) return {};
    return designs.reduce((acc, design) => {
      const projectName = design.projectName || 'Uncategorized';
      if (!acc[projectName]) {
        acc[projectName] = [];
      }
      acc[projectName].push(design);
      return acc;
    }, {} as Record<string, (Design & {id: string})[]>);
  }, [designs]);

  const hasDesigns = designs && designs.length > 0;

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
        ) : hasDesigns ? (
          <div className="space-y-4">
            <h2 className="text-2xl font-headline font-bold">Your Design Projects</h2>
             <Accordion type="single" collapsible className="w-full" defaultValue={Object.keys(groupedDesigns)[0]}>
                {Object.entries(groupedDesigns).map(([projectName, projectDesigns]) => (
                  <AccordionItem value={projectName} key={projectName}>
                    <AccordionTrigger className="text-xl font-semibold hover:no-underline">
                      {projectName} ({projectDesigns.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <DesignsTable designs={projectDesigns} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Your Design Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <DesignsTable designs={[]} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
