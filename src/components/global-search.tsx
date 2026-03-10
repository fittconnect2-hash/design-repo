'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCollection, useFirestore, useUser, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Search, Folder, FileText, User as UserIcon, Loader2 } from "lucide-react";

import type { Project, Design, UserProfile } from '@/lib/definitions';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from './ui/command';

type SearchResult = {
  type: 'Project' | 'Design' | 'User';
  id: string;
  name: string;
  context?: string;
  href: string;
};

export function GlobalSearch() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Admin check
  const userProfileRef = useMemo(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc<UserProfile>(userProfileRef);
  const isSuperAdminByEmail = user?.email === 'fittconnect2@gmail.com';
  const isAdmin = useMemo(() => isSuperAdminByEmail || userProfile?.role === 'Admin', [isSuperAdminByEmail, userProfile]);

  // Data fetching
  const projectsQuery = useMemo(() => query(collection(firestore, 'projects')), [firestore]);
  const { data: projects, isLoading: isLoadingProjects } = useCollection<Project & { id: string }>(projectsQuery);

  const designsQuery = useMemo(() => query(collection(firestore, 'designs')), [firestore]);
  const { data: designs, isLoading: isLoadingDesigns } = useCollection<Design & { id: string }>(designsQuery);

  const usersQuery = useMemo(() => {
    if (!isAdmin) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile & { id: string }>(usersQuery);

  const isLoading = isLoadingProjects || isLoadingDesigns || (isAdmin && isLoadingUsers) || isUserProfileLoading;

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    
    const lowerCaseQuery = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search Projects
    projects?.forEach(project => {
      if (
        project.name.toLowerCase().includes(lowerCaseQuery) ||
        project.description.toLowerCase().includes(lowerCaseQuery)
      ) {
        results.push({
          type: 'Project',
          id: project.id,
          name: project.name,
          context: 'Project',
          href: `/projects/${project.id}`,
        });
      }
    });

    // Search Designs
    designs?.forEach(design => {
      if (
        design.name.toLowerCase().includes(lowerCaseQuery) ||
        design.description.toLowerCase().includes(lowerCaseQuery) ||
        (design.projectName && design.projectName.toLowerCase().includes(lowerCaseQuery)) ||
        (design.tags && design.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)))
      ) {
        results.push({
          type: 'Design',
          id: design.id,
          name: design.name,
          context: design.projectName || 'Design',
          href: `/designs/${design.id}`,
        });
      }
    });

    // Search Users (if admin)
    if (isAdmin) {
      users?.forEach(u => {
        if (
          u.displayName.toLowerCase().includes(lowerCaseQuery) ||
          u.email.toLowerCase().includes(lowerCaseQuery)
        ) {
          results.push({
            type: 'User',
            id: u.id,
            name: u.displayName,
            context: u.email,
            href: `/user-management/${u.id}/edit`,
          });
        }
      });
    }

    return results.slice(0, 10); // Limit to 10 results
  }, [searchQuery, projects, designs, users, isAdmin]);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(searchQuery.length > 0 && open);
  }

  useEffect(() => {
    if (searchQuery.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchQuery]);
  
  const groupedResults = useMemo(() => {
    return searchResults.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {} as Record<SearchResult['type'], SearchResult[]>);
  }, [searchResults]);

  const resultIcons = {
    Project: <Folder className="h-4 w-4 text-muted-foreground" />,
    Design: <FileText className="h-4 w-4 text-muted-foreground" />,
    User: <UserIcon className="h-4 w-4 text-muted-foreground" />,
  };
  
  const handleSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <div className="relative ml-auto flex-1 md:grow-0">
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search designs, projects..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery) setIsOpen(true); }}
            />
          </div>
        </PopoverAnchor>
        {isLoading && searchQuery && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command 
          shouldFilter={false}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          <CommandList>
            {searchResults.length === 0 && searchQuery && !isLoading && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {Object.entries(groupedResults).map(([type, items]) => (
              <CommandGroup key={type} heading={`${type}s`}>
                {items.map(item => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    {resultIcons[item.type as keyof typeof resultIcons]}
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.context}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
