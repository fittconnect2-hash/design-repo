'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import type { Project } from '@/lib/definitions';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';

interface ShareProjectsButtonProps {
  userId: string;
  projects: (Project & { id: string })[];
}

export function ShareProjectsButton({ userId, projects }: ShareProjectsButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
    setGeneratedLink(''); // Invalidate link on selection change
    setCopied(false);
  };

  const generateLink = () => {
    const url = new URL(`${window.location.origin}/share/${userId}`); // Keep userId for routing
    if (selectedProjects.length > 0) {
      url.searchParams.append('projects', selectedProjects.join(','));
    }
    setGeneratedLink(url.toString());
  };

  const handleCopyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink).then(() => {
      setCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'The shareable link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state on close
      setSelectedProjects([]);
      setGeneratedLink('');
      setCopied(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map(p => p.id));
    }
    setGeneratedLink(''); // Invalidate link on selection change
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share Designs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Public Designs</DialogTitle>
          <DialogDescription>
            Select projects to create a shareable link. Only public designs within selected projects will be shown. If no projects are selected, a link for all public designs will be generated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Projects</Label>
            {projects.length > 0 &&
              <Button variant="link" className="p-0 h-auto" onClick={handleSelectAll}>
                {selectedProjects.length === projects.length ? 'Deselect All' : 'Select All'}
              </Button>
            }
          </div>
          <ScrollArea className="h-48 rounded-md border">
            <div className="p-4 space-y-2">
              {projects.length > 0 ? projects.map(project => (
                <div key={project.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`project-${project.id}`}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={() => handleSelectProject(project.id)}
                  />
                  <Label htmlFor={`project-${project.id}`} className="font-normal cursor-pointer flex-1">
                    {project.name}
                  </Label>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No projects available to select.</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {generatedLink && (
            <div className="space-y-2">
                <Label htmlFor="share-link">Your shareable link</Label>
                <div className="flex gap-2">
                    <Input id="share-link" readOnly value={generatedLink} />
                    <Button variant="outline" size="icon" onClick={handleCopyToClipboard}>
                        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        )}

        <DialogFooter className="sm:justify-between gap-2 pt-2">
          <Button onClick={generateLink} className="w-full sm:w-auto">
            {generatedLink ? 'Regenerate Link' : 'Generate Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
