'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, orderBy, query, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DesignsTable } from '@/components/designs-table';
import type { Design, Project } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

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
  const [selectedProjectId, setSelectedProjectId] = useState('all');

  const designsQuery = useMemo(() => {
    if (!userId) return null;
    const collRef = collection(firestore, 'users', userId, 'designs');
    return query(collRef, where('isPublic', '==', true));
  }, [firestore, userId]);

  const { data: designs, isLoading } = useCollection<Design & { id: string }>(designsQuery);

  const projects = useMemo(() => {
    if (!designs) return [];
    const projectMap = new Map<string, string>();
    designs.forEach(design => {
      if (design.projectId && design.projectName) {
        projectMap.set(design.projectId, design.projectName);
      }
    });
    // Sort projects by name before returning
    return Array.from(projectMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [designs]);

  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    if (selectedProjectId === 'all') {
      return designs;
    }
    return designs.filter(design => design.projectId === selectedProjectId);
  }, [designs, selectedProjectId]);

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <h1 className="text-4xl font-headline font-bold tracking-tight">Shared Designs</h1>
            <p className="text-muted-foreground mt-1">A publicly shared collection of designs.</p>
        </header>
        <main className="space-y-6">
          {isLoading ? (
            <SharePageSkeleton />
          ) : designs && designs.length > 0 ? (
            <>
              {projects && projects.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-full max-w-xs space-y-2">
                    <Label htmlFor="project-filter">Filter by Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger id="project-filter">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Projects</SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <Card>
                <DesignsTable designs={filteredDesigns} isPublic={true} />
              </Card>
            </>
          ) : (
             <Card className="flex flex-col items-center justify-center py-20">
              <CardHeader>
                <CardTitle className="text-2xl">No Designs Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mt-2">This user hasn't shared any designs yet.</p>
              </CardContent>
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
