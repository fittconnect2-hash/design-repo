'use client';

import { useMemo } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';

import { AddProjectButton } from '@/components/add-project-button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Project } from '@/lib/definitions';
import { ProjectCard } from '@/components/project-card';
import { ShareProjectsButton } from '@/components/share-projects-button';

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((j) => (
          <Card key={j}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-4 w-1/2" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}


export default function ProjectsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const projectsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const isLoading = isUserLoading || (user && isLoadingProjects);

  const hasProjects = projects && projects.length > 0;

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
        <div className="flex items-center gap-2">
          {user && <ShareProjectsButton userId={user.uid} projects={projects || []} />}
          <AddProjectButton buttonText="Add Project" />
        </div>
      </div>

      {hasProjects ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
         <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Projects Yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Get started by creating your first project.</p>
                <AddProjectButton buttonText="Add Project" />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
