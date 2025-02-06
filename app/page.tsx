/*
<ai_context>
This server page shows a basic home page.
</ai_context>
*/

"use server"

import Link from "next/link"

export default async function HomePage() {
  return (
    <div className="flex-1 p-4 pt-0">
      <h1>Home Page</h1>

      <Link href="/about">About</Link>
    </div>
  )
}
