// Day 1 – Home page: proves React can talk to the Django API.
// useEffect is new: it runs code AFTER the component appears on screen
// (here: call the API once). We'll learn it properly on Day 2–3.
import { useEffect, useState } from 'react'
import { getHealth } from '../api/health'

const Home = () => {
  const [status, setStatus] = useState('checking') // 'checking' | 'ok' | 'error'

  useEffect(() => {
    getHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, []) // [] = run only once, when the page first loads

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-extrabold text-slate-900">🛍️ ShopKart</h1>
        <p className="mt-2 text-slate-500">E-commerce project – Day 1 setup</p>

        <ul className="mt-6 space-y-3">
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="font-medium text-slate-700">React + Tailwind</span>
            <span className="text-green-600 font-semibold">✅ Running</span>
          </li>
          <li className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="font-medium text-slate-700">Django API</span>
            {status === 'checking' && <span className="text-slate-400">⏳ Checking…</span>}
            {status === 'ok' && <span className="text-green-600 font-semibold">✅ Connected</span>}
            {status === 'error' && (
              <span className="text-red-600 font-semibold">❌ Not running</span>
            )}
          </li>
        </ul>

        {status === 'error' && (
          <p className="mt-4 text-sm text-red-600">
            Start the backend: <code>python manage.py runserver</code> in the backend folder.
          </p>
        )}
      </div>
    </main>
  )
}

export default Home
