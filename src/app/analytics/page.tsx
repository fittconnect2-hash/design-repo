'use client';

import { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
} from 'recharts';

import { useCollection, useFirestore } from '@/firebase';
import type { Design, Project } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Detailed analytics of your projects and designs.</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const firestore = useFirestore();

  const designsQuery = useMemo(() => {
    const collRef = collection(firestore, 'designs');
    return query(collRef, orderBy('createdAt', 'asc'));
  }, [firestore]);
  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design>(designsQuery);

  const projectsQuery = useMemo(() => {
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

  const isLoading = isLoadingDesigns || isLoadingProjects;

  const designsPerProject = useMemo(() => {
    if (!projects || !designs) return [];
    return projects.map(project => ({
      name: project.name,
      count: designs.filter(design => design.projectId === project.id).length,
    })).filter(p => p.count > 0);
  }, [projects, designs]);

  const publicVsPrivate = useMemo(() => {
    if (!designs) return [];
    const publicCount = designs.filter(d => d.isPublic).length;
    const privateCount = designs.length - publicCount;
    return [
      { name: 'Public', value: publicCount, fill: 'hsl(var(--chart-1))' },
      { name: 'Private', value: privateCount, fill: 'hsl(var(--chart-2))' },
    ];
  }, [designs]);

  const designsOverTime = useMemo(() => {
    if (!designs) return [];
    const counts = designs.reduce((acc, design) => {
      if (design.createdAt) {
        const date = format(design.createdAt.toDate(), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [designs]);

  if (isLoading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Detailed analytics of your projects and designs.</p>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{projects?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Designs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{designs?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Public vs. Private</CardTitle>
            <CardDescription>A breakdown of design visibility.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-4">
            <ChartContainer config={{}} className="h-[120px] w-[120px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={publicVsPrivate} dataKey="value" nameKey="name" innerRadius={30} strokeWidth={2}>
                  {publicVsPrivate.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
         <Card>
          <CardHeader>
            <CardTitle>Designs per Project</CardTitle>
            <CardDescription>Number of designs within each project.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Designs" } }} className="h-[300px] w-full">
              <BarChart data={designsPerProject} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Designs Over Time</CardTitle>
            <CardDescription>Number of designs created per day.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "New Designs" } }} className="h-[300px] w-full">
              <LineChart data={designsOverTime} margin={{ top: 5, right: 20, left: -10, bottom: 5 }} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => format(new Date(value), 'MMM d')} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
