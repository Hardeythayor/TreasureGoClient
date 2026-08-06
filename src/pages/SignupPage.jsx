import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SignupPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-full max-w-md flex-col items-center justify-center gap-4 bg-navy-deep p-10 text-center text-white md:flex">
        <Compass className="size-9 text-gold-light" />
        <h1 className="font-heading text-2xl font-bold">Treasure Go</h1>
        <p className="max-w-56 text-sm text-white/70">
          Every hunt tells a story. Start yours today.
        </p>
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <form className="w-full max-w-sm">
          <h2 className="mb-5 font-heading text-xl font-semibold">
            Create your account
          </h2>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="name">
              Full name
            </label>
            <Input id="name" placeholder="Amaka Obi" />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="username">
              Username
            </label>
            <Input id="username" placeholder="amaka.o" />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="email">
              Email address
            </label>
            <Input id="email" placeholder="amaka@mail.com" />
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="password">
              Password
            </label>
            <Input id="password" type="password" placeholder="••••••••" />
            <p className="text-[11px] text-muted-foreground">
              Min 8 characters, 1 uppercase, 1 number, 1 symbol
            </p>
          </div>
          <div className="mb-4 space-y-1.5">
            <label className="text-xs font-semibold text-navy-mid" htmlFor="confirm">
              Confirm password
            </label>
            <Input id="confirm" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full">
            Create Account
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <a className="font-semibold text-navy-mid" href="/login">
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}

export default SignupPage
