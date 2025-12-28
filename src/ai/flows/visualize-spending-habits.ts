// VisualizeSpendingHabits.ts
'use server';

/**
 * @fileOverview A flow that visualizes spending habits based on provided expense data.
 *
 * - visualizeSpendingHabits - A function that generates a chart or report visualizing spending habits.
 * - VisualizeSpendingHabitsInput - The input type for the visualizeSpendingHabits function.
 * - VisualizeSpendingHabitsOutput - The return type for the visualizeSpendingHabits function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VisualizeSpendingHabitsInputSchema = z.object({
  expenseData: z.string().describe('JSON string containing an array of expense objects with category and amount fields.'),
});
export type VisualizeSpendingHabitsInput = z.infer<typeof VisualizeSpendingHabitsInputSchema>;

const VisualizeSpendingHabitsOutputSchema = z.object({
  visualization: z.string().describe('A textual description of the spending habits visualization, suitable for display as a chart or report.'),
});
export type VisualizeSpendingHabitsOutput = z.infer<typeof VisualizeSpendingHabitsOutputSchema>;

export async function visualizeSpendingHabits(input: VisualizeSpendingHabitsInput): Promise<VisualizeSpendingHabitsOutput> {
  return visualizeSpendingHabitsFlow(input);
}

const visualizeSpendingHabitsPrompt = ai.definePrompt({
  name: 'visualizeSpendingHabitsPrompt',
  input: {schema: VisualizeSpendingHabitsInputSchema},
  output: {schema: VisualizeSpendingHabitsOutputSchema},
  prompt: `You are an AI assistant specializing in visualizing spending habits.
  Your task is to analyze the provided expense data and generate a textual description of a chart or report that visualizes this data.

The expense data is provided as a JSON string:
{{{expenseData}}}

Based on this data, suggest a chart type (e.g., pie chart, bar chart, line graph) and describe the key insights that the chart should convey. Consider categories and amounts. For example, if there are a few dominant categories, a pie chart would be helpful.

Focus on providing a description that can be used to create a visualization. DO NOT create the visualization, but describe what it should look like and the insights it should provide. Make the description as detailed as possible.
`,
});

const visualizeSpendingHabitsFlow = ai.defineFlow(
  {
    name: 'visualizeSpendingHabitsFlow',
    inputSchema: VisualizeSpendingHabitsInputSchema,
    outputSchema: VisualizeSpendingHabitsOutputSchema,
  },
  async input => {
    const {output} = await visualizeSpendingHabitsPrompt(input);
    return output!;
  }
);
