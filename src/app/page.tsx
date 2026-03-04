import { getDesigns } from '@/lib/data';
import { DesignsTable } from '@/components/designs-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddDesignButton } from '@/components/add-design-button';

export default async function Home() {
  const designs = await getDesigns();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <h1 className="text-2xl font-headline font-bold text-primary">DesignDock</h1>
          <AddDesignButton />
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Design Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <DesignsTable designs={designs} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
