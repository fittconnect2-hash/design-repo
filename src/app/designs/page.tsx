'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';

import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Design, Project } from '@/lib/definitions';
import { DesignsTable } from '@/components/designs-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDesignButton } from '@/components/add-design-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ShareProjectsButton } from '@/components/share-projects-button';

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
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const designsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'designs');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const projectsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    let tempDesigns = designs;
    
    if (selectedProjectId !== 'all') {
      tempDesigns = tempDesigns.filter(design => design.projectId === selectedProjectId);
    }

    if (statusFilter !== 'all') {
      const isPublic = statusFilter === 'public';
      tempDesigns = tempDesigns.filter(design => (design.isPublic ?? false) === isPublic);
    }
    
    return tempDesigns;
  }, [designs, selectedProjectId, statusFilter]);


  const isLoading = isUserLoading || (user && (isLoadingDesigns || isLoadingProjects));

  if (isLoading) {
    return <DesignsPageSkeleton />;
  }
  
  const hasDesigns = designs && designs.length > 0;
  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Design Repo</h1>
          <p className="text-muted-foreground">A complete repository of all your designs.</p>
        </div>
        <div className="flex items-center gap-2">
          {user && <ShareProjectsButton userId={user.uid} projects={projects || []} />}
          <AddDesignButton buttonText="Add Design" />
        </div>
      </div>
      
      {hasDesigns && (
        <div className="flex items-center gap-4">
          {hasProjects && (
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
          )}
           <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="status-filter">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}


      {hasDesigns ? (
        <Card>
          <DesignsTable designs={filteredDesigns || []} projects={projects || []} />
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
