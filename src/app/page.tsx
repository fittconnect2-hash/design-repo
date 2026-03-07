'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">A high-level summary of your workspace.</p>
        </div>
      </div>
       <Card className="flex flex-col items-center justify-center py-20">
          <CardHeader>
            <CardTitle className="text-2xl">Overview Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">This page will provide a summary of your projects and activities.</p>
          </CardContent>
      </Card>
    </div>
  );
}
