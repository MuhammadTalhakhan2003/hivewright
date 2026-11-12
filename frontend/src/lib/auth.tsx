// Clerk sign-in, switched on by VITE_CLERK_PUBLISHABLE_KEY. Without a key every
// component here renders as if sign-in were off, so the app still works.
import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'
import {
  ClerkLoaded, ClerkLoading, ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton, useAuth, useUser,
} from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { AUTH_ENABLED, setTokenGetter } from './api'
import { BRAND } from './brand'
import { go } from './router'
import { Button, Logo } from '../components/ui'

const PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Clerk's modal and user menu, dressed in Hivewright's graphite and sunshine yellow.
// The dark base theme also inverts black provider logos (GitHub, Apple, X) so they stay visible.
const appearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: '#FFC928',
    colorTextOnPrimaryBackground: '#1C1D20',
    colorBackground: '#1C1D20',
    colorText: '#F2F4F1',
    colorTextSecondary: '#9D9F9A',
    colorInputBackground: '#26272C',
    colorInputText: '#F2F4F1',
    colorNeutral: '#F2F4F1',
    colorDanger: '#FF7A6B',
    borderRadius: '14px',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    card: { border: '1px solid #33353B', boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)' },
    formButtonPrimary: { color: '#1C1D20', fontWeight: 600 },
    headerTitle: { fontFamily: '"Space Grotesk", Inter, sans-serif' },
  },
}

function TokenBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setTokenGetter(() => getToken())
    return () => setTokenGetter(null)
  }, [getToken])
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PK) return <>{children}</>
  return (
    <ClerkProvider publishableKey={PK} afterSignOutUrl="/" appearance={appearance}>
      <TokenBridge />
      {children}
    </ClerkProvider>
  )
}

/** Shows `children` to signed-in visitors and a branded sign-in screen to everyone else. */
export function AuthGate({ children }: { children: ReactNode }) {
  if (!AUTH_ENABLED) return <>{children}</>
  return (
    <>
      <ClerkLoading>
        <div className="grid h-dvh place-items-center bg-ink text-sm text-dim">
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4 }}>Opening the hive…</motion.span>
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>{children}</SignedIn>
        <SignedOut><SignInScreen /></SignedOut>
      </ClerkLoaded>
    </>
  )
}

function SignInScreen() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink px-4">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-sun/[0.09] blur-[120px]" />
      <motion.div initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-line bg-ink-2/90 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto w-fit"><Logo size={56} /></div>
        <h1 className="mt-6 font-display text-3xl font-medium tracking-[-0.03em]">
          Your society is <span className="text-sun">waiting</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          Sign in to assemble a team of AI specialists. Your runs, plan and free daily runs follow your account.
        </p>
        <div className="mt-7 grid gap-3">
          <SignUpButton mode="modal">
            <Button size="lg" className="w-full"><Sparkles size={16} />Create a free account</Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="ghost" className="w-full">I already have an account</Button>
          </SignInButton>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-dim">
          <ShieldCheck size={14} className="text-ok" />Secured by Clerk · Google or email · no card
        </p>
        <button onClick={() => go('/')} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-mute transition-colors hover:text-cloud">
          <ArrowLeft size={14} />Back to {BRAND.name}
        </button>
      </motion.div>
    </div>
  )
}

/** Avatar menu and name for the dashboard sidebar. */
export function UserBadge() {
  if (!AUTH_ENABLED) return null
  return (
    <SignedIn>
      <UserRow />
    </SignedIn>
  )
}

function UserRow() {
  const { user } = useUser()
  return (
    <div className="mx-3 mb-2 flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-3 py-2.5">
      <UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-medium">{user?.fullName || user?.username || 'Signed in'}</div>
        <div className="truncate text-[11.5px] text-dim">{user?.primaryEmailAddress?.emailAddress}</div>
      </div>
    </div>
  )
}

/** Landing-page nav: "Sign in" when signed out, avatar when signed in. */
export function NavAuth() {
  if (!AUTH_ENABLED) {
    return <Button variant="ghost" size="sm" className="max-sm:hidden" onClick={() => go('/app')}>Sign in</Button>
  }
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal" forceRedirectUrl="/#/app">
          <Button variant="ghost" size="sm" className="max-sm:hidden">Sign in</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <span className="max-sm:hidden"><UserButton /></span>
      </SignedIn>
    </>
  )
}
