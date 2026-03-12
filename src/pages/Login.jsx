  return (
    /* 1. Darker background for the whole page */
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 py-10 antialiased">
      
      {/* 2. Modified Card: Removed border, added deep dark background */}
      <Card className="w-full max-w-md border-none bg-transparent shadow-none text-white">
        
        <CardHeader className="space-y-6 text-center">
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
              BigDrops ERP
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {isSignup ? 'Create account' : 'Welcome back'}
            </CardTitle>
            <CardDescription className="text-zinc-400">
              {isSignup
                ? 'Set up your account to access your workspace.'
                : 'Access your business workspace from one place.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            
            {/* 3. Inputs: Dark theme with white focus ring */}
            <div className="space-y-2 text-left">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-zinc-500">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-12 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus-visible:ring-white"
              />
            </div>

            <div className="space-y-2 text-left">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-zinc-500">Password</Label>
                {!isSignup && (
                  <button type="button" onClick={handleForgotPassword} className="text-[11px] text-zinc-500 hover:text-white">
                    Forgot?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus-visible:ring-white"
              />
            </div>

            {isSignup && (
              <div className="space-y-2 text-left animate-in fade-in slide-in-from-top-1">
                <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-widest text-zinc-500">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 border-zinc-800 bg-zinc-900/50 text-white placeholder:text-zinc-600 focus-visible:ring-white"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {/* 4. Main Action: Solid White/Black contrast */}
            <Button
              type="button"
              onClick={isSignup ? handleSignUp : handleSignIn}
              disabled={loading}
              className="h-12 w-full bg-white text-black hover:bg-zinc-200 font-bold rounded-lg transition-all"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
            </Button>

            {/* 5. Secondary Action: Subtle Outline */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="h-12 w-full border-zinc-800 bg-transparent text-white hover:bg-zinc-900 hover:text-white"
            >
              <GoogleIcon className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          {error && <Notice kind="error">{error}</Notice>}
          {message && <Notice kind="success">{message}</Notice>}

          <div className="text-center pt-4">
            <button
              type="button"
              className="text-sm font-medium text-zinc-500 hover:text-white transition-colors"
              onClick={() => {
                setMode(isSignup ? 'signin' : 'signup')
                resetFeedback()
              }}
            >
              {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
