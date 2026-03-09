'use client';

import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit, ExternalLink, Figma, Folder, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle as UiCardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Design, Project } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CardTitle } from '@/components/ui/card';

function DesignDetailsSkeleton() {
  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
            <Skeleton className="aspect-video w-full" />
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
          <Separator className="my-2" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DesignDetailsPage() {
  const params = useParams<{ id: string }>();
  const firestore = useFirestore();
  const { toast } = useToast();

  const designRef = useMemo(() => {
    if (!params.id) return null;
    return doc(firestore, 'designs', params.id);
  }, [firestore, params.id]);

  const { data: design, isLoading: isDesignLoading } = useDoc<Design & { id: string }>(designRef);

  const projectRef = useMemo(() => {
    if (!design?.projectId) return null;
    return doc(firestore, 'projects', design.projectId);
  }, [firestore, design]);
  
  const { data: project, isLoading: isProjectLoading } = useDoc<Project>(projectRef);

  const isLoading = isDesignLoading || (design && isProjectLoading);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Link Copied!',
        description: 'The project link has been copied to your clipboard.',
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link.',
      });
    });
  };

  if (isLoading) {
    return <DesignDetailsSkeleton />;
  }

  if (!design) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
          <Button asChild variant="ghost" className="pl-0">
          <Link href="/designs" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All Designs
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button asChild>
            <Link href={`/designs/${design.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="p-0">
            <div className="relative aspect-video w-full">
            <Image
              src={design.imageUrl}
              alt={design.name}
              fill
              className="object-cover"
              data-ai-hint="project hero"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <CardTitle className="text-3xl font-headline font-bold mb-2">{design.name}</CardTitle>
            <Badge variant="outline" className="text-base">v{design.version}</Badge>
          </div>
          <div className="my-4 flex flex-wrap gap-2">
            {design.tags.map((tag, index) => (
              <Badge key={`${tag}-${index}`} variant="secondary">{tag}</Badge>
            ))}
          </div>
          <CardDescription className="text-base text-foreground/80">{design.description}</CardDescription>
          
          <Separator className="my-6" />

           <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                  <div className="font-semibold text-foreground">Project</div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Folder className="h-4 w-4" />
                    {project?.name ?? 'N/A'}
                  </div>
              </div>
              <div>
                  <div className="font-semibold text-foreground">Version</div>
                  <div className="text-muted-foreground">v{design.version}</div>
              </div>
              <div>
                  <div className="font-semibold text-foreground">Created</div>
                  <div className="text-muted-foreground">{design.createdAt ? format(design.createdAt.toDate(), 'PP') : 'N/A'}</div>
              </div>
              <div>
                  <div className="font-semibold text-foreground">Last Updated</div>
                  <div className="text-muted-foreground">{design.updatedAt ? format(design.updatedAt.toDate(), 'PP') : 'N/A'}</div>
              </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <a href={design.figmaLink} target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <UiCardTitle className="text-sm font-medium">Figma Link</UiCardTitle>
                          <Figma className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.figmaLink}</div>
                      </CardContent>
                  </Card>
              </a>
                <a href={design.prototypeUrl} target="_blank" rel="noopener noreferrer" className="group">
                  <Card className="h-full transition-all hover:border-primary hover:shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Prototype Link</CardTitle>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.prototypeUrl}</div>
                      </CardContent>
                  </Card>
              </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
