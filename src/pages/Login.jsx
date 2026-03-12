import { useState } from "react"
import { Loader2, Mail, Lock } from "lucide-react"
import { supabase } from "../supabase"

import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignIn = async () => {
    setError("")
    if (!email || !password) {
      setError("Enter email and password.")
      return
    }

    setLoading(true)

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (err) setError(err.message)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-neutral-50">

      {/* Left visual */}
      <div className="hidden md:flex items-center justify-center bg-neutral-900 text-white p-12">
        <div className="space-y-6 max-w-md">

          <div className="text-sm uppercase tracking-widest text-neutral-400">
            BigDrops ERP
          </div>

          <h1 className="text-4xl font-semibold leading-tight">
            Manage your
            <br />
            business operations
          </h1>

          <p className="text-neutral-400">
            Invoices, quotations, CSR and more —
            all in one workspace.
          </p>

          {/* abstract visual */}
          <div className="mt-10 flex gap-6">
            <div className="w-24 h-24 bg-neutral-700 rounded-full blur-sm"></div>
            <div className="w-32 h-32 bg-neutral-600 rounded-xl"></div>
          </div>

        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center px-6 py-12">

        <Card className="w-full max-w-md p-8 shadow-xl border-neutral-200">

          <div className="space-y-6">

            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-500">
                BigDrops ERP
              </div>

              <h2 className="text-2xl font-semibold mt-2">
                Sign in to continue
              </h2>

              <p className="text-sm text-neutral-500">
                Access your workspace.
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>

              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />

                <Input
                  className="pl-9 h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label>Password</Label>

              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />

                <Input
                  type="password"
                  className="pl-9 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full h-11"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>

            <Button
              variant="outline"
              onClick={handleGoogle}
              className="w-full h-11"
            >
              Continue with Google
            </Button>

          </div>

        </Card>

      </div>
    </div>
  )
}