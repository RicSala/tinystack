export type Note = { id: string; title: string; tags: string[] }

// In-memory store: resets on every server restart, which is fine for a demo.
export const notes: Note[] = [
  { id: "n1", title: "Try the middleware chain", tags: ["demo"] },
  { id: "n2", title: "Read the README", tags: ["docs", "demo"] },
]
