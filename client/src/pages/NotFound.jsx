import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-bgc-base">
      <Navbar />
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div>
          <p className="font-heading text-8xl font-bold gradient-text mb-4">404</p>
          <h1 className="font-heading text-2xl font-bold text-bgc-text mb-3">Page Not Found</h1>
          <p className="text-bgc-muted mb-8">The page you're looking for doesn't exist.</p>
          <Link to="/" className="btn-primary">Go Home</Link>
        </div>
      </div>
    </div>
  )
}
