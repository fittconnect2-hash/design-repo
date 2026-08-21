'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import type { Note } from '@/lib/definitions';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  content: z.string().min(1, { message: 'Content cannot be empty.' }),
  tags: z.string().optional(),
  color: z.string().optional(),
});

type NoteFormValues = z.infer<typeof formSchema>;

const COLORS = [
  { name: 'None', value: 'transparent' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#a855f7' },
];

interface NoteFormProps {
  note?: Note;
  onSuccess?: () => void;
}

export function NoteForm({ note, onSuccess }: NoteFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: note?.title || '',
      content: note?.content || '',
      tags: note?.tags?.join(', ') || '',
      color: note?.color || 'transparent',
    },
  });

  const onSubmit = async (values: NoteFormValues) => {
    if (!user) return;
    setIsSubmitting(true);

    const tagsArray = values.tags?.split(',').map(t => t.trim()).filter(Boolean) || [];
    const noteId = note?.id || doc(collection(firestore, 'notes')).id;
    const noteRef = doc(firestore, 'notes', noteId);

    const data = {
      id: noteId,
      userId: user.uid,
      title: values.title,
      content: values.content,
      tags: tagsArray,
      color: values.color || 'transparent',
      updatedAt: serverTimestamp(),
      ...(note ? {} : { createdAt: serverTimestamp() }),
    };

    try {
      await setDoc(noteRef, data, { merge: true });
      toast({ title: note ? 'Note updated' : 'Note created' });
      if (onSuccess) onSuccess();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save note.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Note title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea placeholder="Write something..." {...field} rows={8} className="resize-none" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma separated)</FormLabel>
              <FormControl>
                <Input placeholder="ideas, draft, feedback" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category Color</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-wrap gap-3"
                >
                  {COLORS.map((color) => (
                    <FormItem key={color.value} className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <RadioGroupItem
                          value={color.value}
                          className="h-6 w-6 rounded-full border-2"
                          style={{ backgroundColor: color.value, borderColor: field.value === color.value ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
                        />
                      </FormControl>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {note ? 'Save Changes' : 'Create Note'}
        </Button>
      </form>
    </Form>
  );
}