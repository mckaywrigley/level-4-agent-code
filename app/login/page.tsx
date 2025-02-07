"use server"

import { Metadata } from "next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

export const metadata: Metadata = {
  title: "Login",
  description: "Login page for the application"
}

export default async function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full px-4 sm:px-0"
      >
        <Card className="w-full max-w-md rounded-lg shadow-lg">
          <CardHeader className="p-6 text-center">
            <h1 className="text-2xl font-semibold">Login</h1>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <form className="space-y-4" aria-label="Login Form">
              <div>
                <Label htmlFor="email" className="block mb-1">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  aria-label="Email address"
                />
              </div>
              <div>
                <Label htmlFor="password" className="block mb-1">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  aria-label="Password"
                />
              </div>
              <div>
                <Button type="submit" className="w-full" aria-label="Submit Login Form">
                  Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
