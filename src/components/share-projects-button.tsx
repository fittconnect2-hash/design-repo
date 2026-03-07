'use client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2 } from 'lucide-react';

export function ShareProjectsButton({ userId }: { userId: string }) {
  const { toast } = useToast();

  const handleShare = () => {
    const url = `${window.location.origin}/share/${userId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: 'Public Link Copied!',
        description: 'A shareable link to your public designs has been copied.',
      });
    }).catch(err => {
      console.error('Failed to copy share link:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not copy the share link.',
      });
    });
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share2 className="mr-2 h-4 w-4" />
      Share Designs
    </Button>
  );
}
