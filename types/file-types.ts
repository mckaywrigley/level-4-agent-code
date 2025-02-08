/*
<ai_context>
Defines the shape of a single file change returned by the
"Text-to-Feature" agent.
</ai_context>
*/

export interface FileChange {
  file: string
  content: string
}
