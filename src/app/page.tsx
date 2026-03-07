'use client';

import { AddDesignButton } from '@/components/add-design-button';
import { DesignCard } from '@/components/design-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Design } from '@/lib/definitions';
import { collection, orderBy, query } from 'firebase/firestore';
import { useMemo } from 'react';

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div key={i}>
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4].map((j) => (
                <Card key={j}>
                  <CardHeader className="p-0">
                    <Skeleton className="aspect-video w-full" />
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const designsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'users', user.uid, 'designProjects');
    return query(collRef, orderBy('updatedAt', 'desc'));
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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Your creative workspace. Grouped and organized.</p>
        </div>
        <AddDesignButton />
      </div>

      {hasDesigns ? (
        <Accordion type="multiple" className="w-full space-y-6" defaultValue={Object.keys(groupedDesigns)}>
          {Object.entries(groupedDesigns).map(([projectName, projectDesigns]) => (
            <AccordionItem value={projectName} key={projectName} className="border-none">
              <AccordionTrigger className="text-2xl font-headline font-semibold hover:no-underline rounded-lg bg-card border p-4 data-[state=open]:rounded-b-none">
                <div className="flex items-center gap-3">
                  <span>{projectName}</span>
                  <Badge variant="secondary" className="text-base">{projectDesigns.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="bg-card border border-t-0 rounded-b-lg p-4">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {projectDesigns.map(design => (
                    <DesignCard key={design.id} design={design} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
         <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Designs Yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Get started by adding your first design project.</p>
                <AddDesignButton />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
