export default function OfflinePage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl text-center">
      <h1 className="text-2xl font-bold mb-2">You’re offline</h1>
      <p className="text-muted-foreground mb-6">
        Some features may be unavailable. Please check your internet connection.
      </p>
      <button
        className="inline-flex items-center px-4 py-2 rounded-md border text-sm"
        onClick={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  )
}


