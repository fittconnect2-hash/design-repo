'use client';

import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DesignsTable } from '@/components/designs-table';
import type { Design } from '@/lib/definitions';
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
import { useParams, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

function SharePageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function SharePage() {
  const firestore = useFirestore();
  const params = useParams<{ userId: string }>();
  const searchParams = useSearchParams();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const projectIds = useMemo(() => {
    const projectsParam = searchParams.get('projects');
    return projectsParam ? projectsParam.split(',') : [];
  }, [searchParams]);

  const designsQuery = useMemo(() => {
    const collRef = collection(firestore, 'designs');
    
    const clauses = [where('isPublic', '==', true)];

    if (projectIds.length > 0) {
      clauses.push(where('projectId', 'in', projectIds));
    }
    
    // Fetch all public designs, optionally filtered by project IDs.
    return query(collRef, ...clauses);
  }, [firestore, projectIds]);

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
    let tempDesigns = designs;

    if (selectedProjectId !== 'all') {
        tempDesigns = tempDesigns.filter(design => design.projectId === selectedProjectId);
    }
    
    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        tempDesigns = tempDesigns.filter(design => 
            design.name.toLowerCase().includes(lowercasedTerm) ||
            (design.projectName && design.projectName.toLowerCase().includes(lowercasedTerm)) ||
            (design.tags && design.tags.some(tag => tag.toLowerCase().includes(lowercasedTerm)))
        );
    }

    return tempDesigns;
  }, [designs, selectedProjectId, searchTerm]);

  const pageTitle = projectIds.length > 0 ? "Shared Project Designs" : "Shared Designs";
  const pageDescription = projectIds.length > 0 
    ? "A collection of public designs from selected projects."
    : "A collection of all public designs in the workspace.";

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 md:p-10 w-full animate-in fade-in-0 duration-500">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-8">
            <h1 className="text-4xl font-headline font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-muted-foreground mt-1">{pageDescription}</p>
        </header>
        <main className="space-y-6">
          {isLoading ? (
            <SharePageSkeleton />
          ) : designs && designs.length > 0 ? (
            <>
              <div className="flex flex-col md:flex-row items-center gap-4">
                {projects && projects.length > 1 && (
                  <div className="w-full md:w-auto md:max-w-xs space-y-2">
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
                )}
                 <div className="w-full md:w-auto md:max-w-xs space-y-2 flex-grow">
                    <Label htmlFor="search-filter">Search Designs</Label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="search-filter"
                            type="search"
                            placeholder="Search by name, project, or tag..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
              </div>
              <Card>
                <DesignsTable designs={filteredDesigns} isPublic={true} userId={params.userId} />
              </Card>
            </>
          ) : (
             <Card className="flex flex-col items-center justify-center py-20">
              <CardHeader>
                <CardTitle className="text-2xl">No Public Designs Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mt-2">There are no designs currently marked as public for the selected criteria.</p>
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
