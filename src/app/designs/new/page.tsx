import { DesignForm } from '@/components/design-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewDesignPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center px-4 md:px-6">
          <Button asChild variant="ghost" className="pl-0">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to projects
            </Link>
          </Button>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl p-4 md:p-6">
        <DesignForm />
      </main>
    </div>
  );
}
import { Button } from '@/components/ui/button';
