'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query, doc } from 'firebase/firestore';
import { Download, FileJson, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import type { Design, Project, UserProfile } from '@/lib/definitions';
import { DesignsTable } from '@/components/designs-table';
import { Skeleton } from '@/components/ui/skeleton';
import { AddDesignButton } from '@/components/add-design-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { ShareProjectsButton } from '@/components/share-projects-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

function DesignsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}


export default function DesignsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Admin check
  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);

  const designsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'designs');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);

  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const projectsQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'projects');
    return query(collRef, orderBy('name', 'asc'));
  }, [firestore, user]);

  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    let tempDesigns = designs;
    
    if (selectedProjectId !== 'all') {
      tempDesigns = tempDesigns.filter(design => design.projectId === selectedProjectId);
    }

    if (statusFilter !== 'all') {
      const isPublic = statusFilter === 'public';
      tempDesigns = tempDesigns.filter(design => (design.isPublic ?? false) === isPublic);
    }
    
    return tempDesigns;
  }, [designs, selectedProjectId, statusFilter]);

  const handleExportCSV = () => {
    if (!filteredDesigns || filteredDesigns.length === 0) return;
    const headers = ['Design Name', 'Project Name', 'Version', 'Description', 'Figma Link', 'Prototype URL', 'Tags', 'Visibility', 'Last Updated'];
    const rows = filteredDesigns.map(d => [
        d.name,
        d.projectName || 'N/A',
        d.version,
        d.description?.replace(/\n/g, " ") || 'No description',
        d.figmaLink || 'N/A',
        d.prototypeUrl || 'N/A',
        d.tags?.join(', ') || '',
        d.isPublic ? 'Public' : 'Private',
        d.updatedAt ? format(d.updatedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `designdock_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (!filteredDesigns || filteredDesigns.length === 0) return;
    
    const data = filteredDesigns.map(d => ({
        'Design Name': d.name,
        'Project Name': d.projectName || 'N/A',
        'Version': d.version,
        'Description': d.description || '',
        'Figma Link': d.figmaLink || '',
        'Prototype URL': d.prototypeUrl || '',
        'Tags': d.tags?.join(', ') || '',
        'Visibility': d.isPublic ? 'Public' : 'Private',
        'Last Updated': d.updatedAt ? format(d.updatedAt.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    
    // Set professional column widths
    const wscols = [
      {wch: 35}, // Design Name
      {wch: 25}, // Project Name
      {wch: 10}, // Version
      {wch: 50}, // Description
      {wch: 40}, // Figma Link
      {wch: 40}, // Prototype URL
      {wch: 20}, // Tags
      {wch: 12}, // Visibility
      {wch: 20}, // Last Updated
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Design Repository");
    XLSX.writeFile(workbook, `designdock_export_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };


  const isLoading = isUserLoading || isUserProfileLoading || (user && (isLoadingDesigns || isLoadingProjects));

  if (isLoading) {
    return <DesignsPageSkeleton />;
  }
  
  const hasDesigns = designs && designs.length > 0;
  const hasProjects = projects && projects.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
       <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Design Repo</h1>
          <p className="text-muted-foreground">A complete repository of all your designs.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasDesigns && isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileJson className="mr-2 h-4 w-4" />
                  As CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  As Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {user && <ShareProjectsButton userId={user.uid} projects={projects || []} />}
          <AddDesignButton buttonText="Add Design" />
        </div>
      </div>
      
      {hasDesigns && (
        <div className="flex items-center gap-4">
          {hasProjects && (
            <div className="w-full max-w-xs space-y-2">
              <Label htmlFor="project-filter">Filter by Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger id="project-filter">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
           <div className="w-full max-w-xs space-y-2">
            <Label htmlFor="status-filter">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}


      {hasDesigns ? (
        <Card>
          <DesignsTable designs={filteredDesigns || []} />
        </Card>
      ) : (
         <Card className="flex flex-col items-center justify-center py-20">
            <CardHeader>
              <CardTitle className="text-2xl">No Designs Yet</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground">Get started by adding your first design.</p>
                <AddDesignButton buttonText="Add Design" />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
