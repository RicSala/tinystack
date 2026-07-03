const examples = [
  {
    title: "withQuery — valid",
    cmd: `curl "localhost:3000/api/notes?page=2&tag=demo"`,
  },
  {
    title: "withQuery — invalid (400 + zod issues)",
    cmd: `curl "localhost:3000/api/notes?page=0"`,
  },
  {
    title: "withBody — valid (201)",
    cmd: `curl -X POST localhost:3000/api/notes -H 'content-type: application/json' -d '{"title":"New note"}'`,
  },
  {
    title: "withBody — malformed JSON (400, not a crash)",
    cmd: `curl -X POST localhost:3000/api/notes -H 'content-type: application/json' -d '{oops'`,
  },
  {
    title: "Short-circuit — missing auth (401)",
    cmd: `curl localhost:3000/api/notes/n1`,
  },
  {
    title: "Full chain — auth + ordering + withParams",
    cmd: `curl localhost:3000/api/notes/n1 -H 'x-user: ada'`,
  },
  {
    title: "withParams — invalid segment (400)",
    cmd: `curl localhost:3000/api/notes/nope -H 'x-user: ada'`,
  },
]

export default function Home() {
  return (
    <main>
      <h1>@tinystack/next-middleware demo</h1>
      <p>
        Route handlers live in <code>app/api/notes/</code>. Try these:
      </p>
      {examples.map((example) => (
        <section key={example.title}>
          <h3>{example.title}</h3>
          <pre>{example.cmd}</pre>
        </section>
      ))}
    </main>
  )
}
