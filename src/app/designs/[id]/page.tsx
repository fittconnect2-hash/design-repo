import { getDesignById } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Edit, ExternalLink, Figma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default async function DesignDetailsPage({ params }: { params: { id: string } }) {
  const design = await getDesignById(params.id);

  if (!design) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
           <Button asChild variant="ghost" className="pl-0">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              All Projects
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/designs/${design.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-4xl p-4 md:p-6">
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
            <CardTitle className="text-3xl font-headline font-bold">{design.name}</CardTitle>
            <div className="my-4 flex flex-wrap gap-2">
              {design.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <CardDescription className="text-base text-foreground/80">{design.description}</CardDescription>
            
            <Separator className="my-6" />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <a href={design.figmaUrl} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Figma Link</CardTitle>
                            <Figma className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-bold text-primary group-hover:underline truncate">{design.figmaUrl}</div>
                        </CardContent>
                    </Card>
                </a>
                 <a href={design.prototypeUrl} target="_blank" rel="noopener noreferrer" className="group">
                    <Card className="h-full transition-all hover:border-primary hover:shadow-md">
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
      </main>
    </div>
  );
}
