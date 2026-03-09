'use client';

import { useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Calendar, FileText, PlusCircle } from 'lucide-react';

import { useDoc, useCollection, useFirestore } from '@/firebase';
import type { Design, Project } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DesignsTable } from '@/components/designs-table';
import { AddDesignButton } from '@/components/add-design-button';

function ProjectDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}


export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();

  const projectRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'projects', params.id);
  }, [firestore, params.id]);

  const { data: project, isLoading: isProjectLoading } = useDoc<Project & { id: string }>(projectRef);
  
  const designsQuery = useMemo(() => {
    if (!params.id) return null;
    const collRef = collection(firestore, 'designs');
    return query(collRef, where('projectId', '==', params.id));
  }, [firestore, params.id]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const isLoading = isProjectLoading || isLoadingDesigns;

  if (isLoading) {
    return <ProjectDetailsSkeleton />;
  }

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" className="pl-0">
          <Link href="/projects" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All Projects
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/projects/${project.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline font-bold">{project.name}</CardTitle>
          <CardDescription className="pt-2">{project.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Start Date: {project.startDate ? format(project.startDate.toDate(), 'PP') : 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>End Date: {project.endDate ? format(project.endDate.toDate(), 'PP') : 'N/A'}</span>
            </div>
             <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{designs?.length ?? 0} Designs</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-headline font-bold">Designs in this Project</h2>
           <AddDesignButton buttonText="Add Design to Project" />
        </div>

        {designs && designs.length > 0 ? (
          <Card>
            <DesignsTable designs={designs} />
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Designs Yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">Get started by adding a design to this project.</p>
              <AddDesignButton buttonText="Add Design" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
