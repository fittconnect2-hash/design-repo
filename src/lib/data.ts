import 'server-only';
import type { Design } from '@/lib/definitions';
import { PlaceHolderImages } from './placeholder-images';

// In-memory store
let designs: Design[] = PlaceHolderImages.map((img, index) => ({
    id: `design-${index + 1}`,
    name: `Project ${img.imageHint.charAt(0).toUpperCase() + img.imageHint.slice(1)}`,
    description: `A design project focusing on ${img.imageHint}. This project explores modern design principles and user experience strategies to deliver an intuitive and visually appealing product.`,
    figmaUrl: 'https://figma.com',
    prototypeUrl: 'https://figma.com/proto',
    imageUrl: img.imageUrl,
    tags: [...img.imageHint.split(' '), 'design', 'creative'],
}));

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getDesigns(): Promise<Design[]> {
  await delay(100);
  return JSON.parse(JSON.stringify(designs));
}

export async function getDesignById(id: string): Promise<Design | undefined> {
  await delay(100);
  const design = designs.find(d => d.id === id);
  return design ? JSON.parse(JSON.stringify(design)) : undefined;
}

export async function addDesign(design: Omit<Design, 'id'>): Promise<Design> {
  await delay(200);
  const newDesign: Design = {
    ...design,
    id: `design-${Date.now()}`,
  };
  designs.unshift(newDesign);
  return JSON.parse(JSON.stringify(newDesign));
}

export async function updateDesign(id: string, updatedDesignData: Partial<Omit<Design, 'id'>>): Promise<Design | null> {
  await delay(200);
  const designIndex = designs.findIndex(d => d.id === id);
  if (designIndex === -1) {
    return null;
  }
  designs[designIndex] = { ...designs[designIndex], ...updatedDesignData };
  return JSON.parse(JSON.stringify(designs[designIndex]));
}

export async function deleteDesign(id: string): Promise<void> {
  await delay(200);
  designs = designs.filter(d => d.id !== id);
}
