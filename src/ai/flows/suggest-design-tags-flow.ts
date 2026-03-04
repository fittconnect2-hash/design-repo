'use server';
/**
 * @fileOverview An AI agent that suggests relevant tags or keywords for design projects.
 *
 * - suggestDesignTags - A function that handles the tag suggestion process.
 * - SuggestDesignTagsInput - The input type for the suggestDesignTags function.
 * - SuggestDesignTagsOutput - The return type for the suggestDesignTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDesignTagsInputSchema = z.object({
  name: z.string().describe('The name of the design project.'),
  description: z
    .string()
    .describe('A detailed description of the design project.'),
});
export type SuggestDesignTagsInput = z.infer<typeof SuggestDesignTagsInputSchema>;

const SuggestDesignTagsOutputSchema = z.object({
  tags: z
    .array(z.string())
    .describe(
      'A list of relevant keywords or tags for the design project, separated by commas.'
    ),
});
export type SuggestDesignTagsOutput = z.infer<typeof SuggestDesignTagsOutputSchema>;

export async function suggestDesignTags(
  input: SuggestDesignTagsInput
): Promise<SuggestDesignTagsOutput> {
  return suggestDesignTagsFlow(input);
}

const suggestDesignTagsPrompt = ai.definePrompt({
  name: 'suggestDesignTagsPrompt',
  input: {schema: SuggestDesignTagsInputSchema},
  output: {schema: SuggestDesignTagsOutputSchema},
  prompt: `You are an expert design project categorizer. Your task is to generate relevant keywords and tags for a design project based on its name and description.

Project Name: {{{name}}}
Project Description: {{{description}}}

Generate a comma-separated list of 5-10 concise and highly relevant tags. Focus on key themes, technologies, design elements, and functionality.`,
});

const suggestDesignTagsFlow = ai.defineFlow(
  {
    name: 'suggestDesignTagsFlow',
    inputSchema: SuggestDesignTagsInputSchema,
    outputSchema: SuggestDesignTagsOutputSchema,
  },
  async input => {
    const {output} = await suggestDesignTagsPrompt(input);
    return output!;
  }
);
