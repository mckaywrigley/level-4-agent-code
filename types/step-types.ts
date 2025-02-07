/*
<ai_context>
Defines the shape of a single step returned by the Planner Agent,
so we can pass it around to the "Text-to-Feature" agent.
</ai_context>
*/

export interface Step {
  stepName: string
  stepDescription: string
  stepPlan: string
}
