export default function LoadingSpinner({ fullScreen = false, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const spinner = (
    <div className={`${sizes[size]} rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin`} />
  )
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-bgc-base flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-bgc-border border-t-bgc-pink animate-spin" />
          <p className="text-bgc-muted text-sm font-medium">Loading...</p>
        </div>
      </div>
    )
  }
  return spinner
}
