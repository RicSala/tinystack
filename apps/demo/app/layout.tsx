import type { ReactNode } from "react"

export const metadata = {
  title: "@tinystack/next-middleware demo",
  description: "Type-safe middleware chains for Next.js route handlers",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "monospace", margin: "2rem" }}>
        {children}
      </body>
    </html>
  )
}
