'use client';

import { useMemo, useState } from 'react';
import { collection, orderBy, query, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Search, Plus, MoreVertical, Trash2, Edit, Tag, Clock } from 'lucide-react';
import { format } from 'date-fns';

import { useCollection, useFirestore, useUser } from '@/firebase';
import type { Note } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NoteForm } from '@/components/note-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';

function NotesSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

export default function NotesPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const notesQuery = useMemo(() => {
    if (!user) return null;
    const collRef = collection(firestore, 'notes');
    return query(collRef, orderBy('updatedAt', 'desc'));
  }, [firestore, user]);

  const { data: notes, isLoading } = useCollection<Note>(notesQuery);

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchTerm) return notes;
    const lower = searchTerm.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(lower) || 
      n.content.toLowerCase().includes(lower) ||
      n.tags.some(t => t.toLowerCase().includes(lower))
    );
  }, [notes, searchTerm]);

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsFormOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await deleteDoc(doc(firestore, 'notes', noteId));
      toast({ title: 'Note deleted' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete note.' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-headline font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">Manage your ideas and project snippets.</p>
        </div>
        <Button onClick={() => { setEditingNote(null); setIsFormOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <NotesSkeleton />
      ) : filteredNotes.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map(note => (
            <Card key={note.id} className="group overflow-hidden hover:shadow-md transition-shadow relative" style={{ borderLeft: `4px solid ${note.color || 'transparent'}` }}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg line-clamp-1">{note.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(note)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(note.id)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3 min-h-[80px]">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{note.content}</p>
              </CardContent>
              <CardFooter className="pt-0 flex flex-col items-start gap-3">
                <div className="flex flex-wrap gap-1">
                  {note.tags?.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Tag className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center text-[10px] text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3" />
                  {note.updatedAt ? format(note.updatedAt.toDate(), 'PP p') : 'N/A'}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-20">
          <CardHeader>
            <CardTitle className="text-2xl">No Notes Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Start by creating your first note.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => { setEditingNote(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </CardFooter>
        </Card>
      )}

      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</SheetTitle>
            <SheetDescription>
              Organize your thoughts with tags and colors.
            </SheetDescription>
          </SheetHeader>
          <div className="py-6">
            <NoteForm 
              note={editingNote || undefined} 
              onSuccess={() => setIsFormOpen(false)} 
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}