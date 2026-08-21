import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { useSubscription } from '@/context/SubscriptionContext'
import { ApiError, isApiConfigured } from '@/lib/api'
import { createSubscriptionRequest, verifyTransactionRequest } from '@/services/subscriptionsService'

const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ?? ''

function TierCard({ id, name, amount, validity, type, rewardAmount, icon, serverActive }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activateTier, isTierActive } = useSubscription()

  const premium = type === 'premium'
  // Payment/activation/routing are all keyed by the real backend tier `id`
  // now — using the dollar amount as a routing/activation key broke down
  // once two tiers could share the same amount, and it also forced
  // TierTreasuresPage to fetch the tiers list just to resolve amount -> id
  // before it could fetch treasures. `name` (e.g. "$75") stays display-only.
  const numericAmount = Number(amount)
  // The server's current_user_subscription is the authoritative signal when
  // available. The local (Flutterwave-callback) check is kept as a fallback
  // for the moment right after a successful payment, in case the tiers list
  // hasn't been refetched yet.
  const active = serverActive || isTierActive(id)

  const [txRef, setTxRef] = useState(null)
  const [txAmount, setTxAmount] = useState(numericAmount)
  const [creatingCheckout, setCreatingCheckout] = useState(false)
  // A ref (not state) so setting it doesn't itself trigger a render — it
  // just flags "a fresh tx_ref just landed, fire the payment once the
  // effect below sees it," without calling setState from inside an effect.
  const pendingPaymentRef = useRef(false)

  const features = [
    `${premium ? 'Unlimited' : 'Limited'} hunts within tier`,
    `Valid for ${validity} days`,
    'Access to premium treasures',
    `$${rewardAmount} Amazon Gift Card`,
  ]

  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef ?? '',
    amount: txAmount,
    currency: 'USD',
    payment_options: 'card',
    customer: {
      email: user?.email ?? 'guest@treasurego.com',
    },
    customizations: {
      title: 'Treasure Go',
      description: `${name} Treasure Pass`,
    },
  }

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig)

  // handleFlutterPayment only ever uses the tx_ref/amount it was created
  // with on THIS render — since getting a real tx_ref requires an async
  // POST /subscriptions first, we set state and wait for the render that
  // config to actually happen before invoking it, rather than calling it
  // immediately with a stale (empty) tx_ref.
  useEffect(() => {
    if (!pendingPaymentRef.current || !txRef) return
    pendingPaymentRef.current = false

    // handleFlutterPayment is itself async: it awaits the Flutterwave
    // script (if not already loaded) before calling window.FlutterwaveCheckout,
    // which is what actually mounts the inline checkout. Its promise
    // resolving is the closest available signal that the checkout is now
    // on screen, so that's when the button's loading state clears and our
    // own dialog (kept open until now so the loader stays visible) closes —
    // its backdrop would otherwise sit on top of and eat clicks meant for
    // the Flutterwave iframe.
    handleFlutterPayment({
      callback: (response) => {
        closePaymentModal()
        if (response.status !== 'successful') return

        if (!isApiConfigured()) {
          activateTier(id, txRef)
          navigate(`/treasures/${id}`)
          return
        }

        verifyTransactionRequest(txRef)
          .then(() => {
            activateTier(id, txRef)
            toast.success('Payment verified! Your subscription is now active.')
            navigate(`/treasures/${id}`)
          })
          .catch((err) => {
            const reachedBackend = err instanceof ApiError && err.status > 0
            toast.error(
              reachedBackend
                ? err.message
                : 'Unable to verify your payment. Please contact support if you were charged.',
            )
          })
      },
      onClose: () => {},
    }).finally(() => {
      setCreatingCheckout(false)
      setOpen(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txRef])

  function handleOpen() {
    setOpen(true)
  }

  async function handleSelect() {
    if (active || !premium) {
      setOpen(false)
      navigate(`/treasures/${id}`)
      return
    }

    if (!isApiConfigured()) {
      // No backend to create/verify a real transaction against — fall back
      // to the old direct-to-Flutterwave path with a locally-generated
      // reference. Loading state still clears via the effect above, once
      // the checkout is actually on screen.
      setCreatingCheckout(true)
      setTxAmount(numericAmount)
      setTxRef(`treasuregolive-${id}-${Date.now()}`)
      pendingPaymentRef.current = true
      return
    }

    setCreatingCheckout(true)
    try {
      const result = await createSubscriptionRequest(id)
      setTxAmount(Number(result?.transaction?.amount ?? numericAmount))
      setTxRef(result?.transaction?.transaction_reference)
      pendingPaymentRef.current = true
      // Not cleared here — stays true until the checkout effect's
      // handleFlutterPayment promise resolves, so the loader spans the full
      // gap from click to the inline checkout actually being displayed.
    } catch (err) {
      const reachedBackend = err instanceof ApiError && err.status > 0
      toast.error(
        reachedBackend
          ? err.message
          : 'Unable to reach the server. Please check your connection and try again.',
      )
      setCreatingCheckout(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center gap-4 rounded-2xl bg-linear-to-br from-navy-mid to-navy-deep p-4 text-left shadow-lg ring-1 ring-white/10 transition-transform hover:-translate-y-0.5"
      >
        <img src={icon} alt="" className="size-24 shrink-0 drop-shadow-xl" />
        <div className="flex flex-1 flex-col items-end gap-2">
          <Badge variant={active ? 'success' : premium ? 'warning' : 'success'}>
            {active ? 'Active' : premium ? 'Premium' : 'Free Access'}
          </Badge>
          <div className="font-heading text-3xl font-bold text-white">
            {name}
          </div>
        </div>
      </button>

      <DialogContent
        showCloseButton={false}
        className="max-w-xs overflow-hidden rounded-3xl border-0 bg-navy-deep p-0 text-white shadow-2xl"
      >
        <DialogClose className="absolute top-4 right-4 z-10 text-white/60 transition-colors hover:text-white">
          <X className="size-4.5" />
        </DialogClose>

        <div className="flex flex-col items-center px-7 pt-9 pb-7">
          <DialogTitle className="font-heading text-sm font-semibold tracking-[0.15em] text-gold-light uppercase">
            {premium ? 'Premium' : 'Free'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details for the {name} treasure pass tier
          </DialogDescription>

          <div className="mt-2 font-heading text-5xl font-bold text-white">
            {name}
          </div>
          <div className="mt-4 h-px w-16 bg-white/20" />

          <ul className="mt-6 w-full space-y-3.5">
            {features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-3 text-sm text-white/90"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold text-navy-deep">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            onClick={handleSelect}
            size="lg"
            className="mt-7 w-full rounded-full"
            disabled={creatingCheckout}
          >
            {creatingCheckout ? 'Preparing checkout…' : active ? 'View Treasures' : 'Select'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TierCard
