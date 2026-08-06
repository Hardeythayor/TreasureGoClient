import { useState } from 'react'
import { useNavigate } from 'react-router'
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

const FLUTTERWAVE_PUBLIC_KEY = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ?? ''

function TierCard({ price, premium, icon }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { activateTier, isTierActive } = useSubscription()

  const tierId = price.replace('$', '')
  const amount = Number(tierId)
  const active = isTierActive(tierId)

  // Generated when the dialog is opened (not inline during render, so the
  // value stays stable across re-renders) and refreshed on every open so a
  // retry after a cancelled payment doesn't reuse the same reference.
  const [txRef, setTxRef] = useState(null)

  const features = [
    `${premium ? 'Unlimited' : 'Limited'} hunts within tier`,
    'Valid for 30 days',
    'Access to premium treasures',
  ]

  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: txRef ?? '',
    amount,
    currency: 'USD',
    payment_options: 'card',
    customer: {
      email: user?.email ?? 'guest@treasurego.com',
    },
    customizations: {
      title: 'Treasure Go',
      description: `${price} Treasure Pass`,
    },
  }

  const handleFlutterPayment = useFlutterwave(flutterwaveConfig)

  function handleOpen() {
    setTxRef(`treasuregolive-${tierId}-${Date.now()}`)
    setOpen(true)
  }

  function handleSelect() {
    setOpen(false)

    if (active || !premium) {
      navigate(`/treasures/${tierId}`)
      return
    }

    // Close first: our dialog's backdrop stays mounted long enough to eat
    // every click on the Flutterwave iframe otherwise, since its bg-black/10
    // overlay is easy to miss visually but still intercepts pointer events.
    handleFlutterPayment({
      callback: (response) => {
        closePaymentModal()
        if (response.status === 'successful') {
          activateTier(tierId, response.tx_ref)
          navigate(`/treasures/${tierId}`)
        }
      },
      onClose: () => {},
    })
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
            {price}
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
            Details for the {price} treasure pass tier
          </DialogDescription>

          <div className="mt-2 font-heading text-5xl font-bold text-white">
            {price}
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
          >
            {active ? 'View Treasures' : 'Select'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TierCard
