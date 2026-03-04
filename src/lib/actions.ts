'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addDesign, updateDesign as updateDesignData, deleteDesign as deleteDesignData } from '@/lib/data';

const DesignSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    description: z.string().min(1, 'Description is required.'),
    figmaUrl: z.string().url('Please enter a valid Figma URL.'),
    prototypeUrl: z.string().url('Please enter a valid Prototype URL.'),
    imageUrl: z.string().url('Please enter a valid Image URL.'),
    tags: z.string().transform(val => val.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)),
});

export async function createDesign(formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = DesignSchema.safeParse(rawFormData);
    
    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        throw new Error('Validation failed. Check server logs.');
    }

    try {
        await addDesign(validatedFields.data);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to create design.');
    }

    revalidatePath('/');
    redirect('/');
}

export async function updateDesign(id: string, formData: FormData) {
    const rawFormData = Object.fromEntries(formData.entries());
    const validatedFields = DesignSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        console.error(validatedFields.error.flatten().fieldErrors);
        throw new Error('Validation failed. Check server logs.');
    }
    
    try {
        await updateDesignData(id, validatedFields.data);
    } catch (error) {
        console.error(error);
        throw new Error('Failed to update design.');
    }

    revalidatePath('/');
    revalidatePath(`/designs/${id}`);
    redirect(`/designs/${id}`);
}

export async function deleteDesign(id: string) {
    try {
        await deleteDesignData(id);
        revalidatePath('/');
    } catch (error) {
        console.error(error);
        throw new Error('Failed to delete design.');
    }
}
