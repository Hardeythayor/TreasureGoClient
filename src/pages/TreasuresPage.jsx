import TierCard from '@/components/treasure/TierCard'

const tiers = [
  { price: '$10', premium: false, icon: '/assets/chest-1.png' },
  { price: '$25', premium: false, icon: '/assets/chest-2.png' },
  { price: '$50', premium: false, icon: '/assets/chest-3.png' },
  { price: '$75', premium: true, icon: '/assets/chest-4.png' },
  { price: '$100', premium: true, icon: '/assets/chest-5.png' },
  { price: '$200', premium: true, icon: '/assets/chest-6.png' },
]

function TreasuresPage() {
  return (
    <div className="mx-auto max-w-5xl py-10 px-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-16 lg:grid-cols-3">
        {tiers.map((tier) => (
          <TierCard key={tier.price} {...tier} />
        ))}
      </div>
    </div>
  )
}

export default TreasuresPage
