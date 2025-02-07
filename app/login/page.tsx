"use server"

import { Metadata } from "next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Login",
  description: "Login page for the application"
}

export default async function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow">
        <h1 className="text-2xl font-semibold text-center">Login</h1>
        <form className="space-y-4">
          <div>
            <Label htmlFor="email" className="block mb-1">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" />
          </div>
          <div>
            <Label htmlFor="password" className="block mb-1">Password</Label>
            <Input id="password" type="password" placeholder="Enter your password" />
          </div>
          <div>
            <Button type="submit" className="w-full">Login</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
