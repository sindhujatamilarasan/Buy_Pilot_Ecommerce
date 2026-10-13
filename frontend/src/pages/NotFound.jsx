import { Link } from 'react-router-dom'
import Message from '../components/Message'

const NotFound = ({ forbidden = false }) => (
  <div className="mx-auto max-w-lg py-16">
    <Message icon={forbidden ? '⛔' : '🔍'} title={forbidden ? 'You don’t have access to this page' : 'Page not found (404)'}>
      <Link to="/" className="font-semibold text-gold-700">← Back to home</Link>
    </Message>
  </div>
)

export default NotFound
