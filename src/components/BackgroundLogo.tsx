import mastersLogo from '@/assets/og-image-masters.svg'

export function BackgroundLogo() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0 brand-bg-logo brand-bg-fixed"
      style={{
        backgroundImage: `url(${mastersLogo})`
      }}
    />
  )
}