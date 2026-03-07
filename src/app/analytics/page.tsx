'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Detailed analytics of your projects and designs.</p>
        </div>
      </div>
       <Card className="flex flex-col items-center justify-center py-20">
          <CardHeader>
            <CardTitle className="text-2xl">Analytics Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">This page will provide detailed analytics and insights.</p>
          </CardContent>
      </Card>
    </div>
  );
}
