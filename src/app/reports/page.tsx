'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and view reports for your workspace.</p>
        </div>
      </div>
       <Card className="flex flex-col items-center justify-center py-20">
          <CardHeader>
            <CardTitle className="text-2xl">Reporting Coming Soon</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">This page will allow you to generate and view custom reports.</p>
          </CardContent>
      </Card>
    </div>
  );
}
