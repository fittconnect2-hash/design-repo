import { DesignForm } from '@/components/design-form';
import { getDesignById } from '@/lib/data';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function EditDesignPage({ params }: { params: { id: string } }) {
  const design = await getDesignById(params.id);

  if (!design) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Button asChild variant="ghost" className="pl-0">
            <Link href={`/designs/${params.id}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to project
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl p-4 md:p-6">
        <DesignForm design={design} />
      </main>
    </div>
  );
}
