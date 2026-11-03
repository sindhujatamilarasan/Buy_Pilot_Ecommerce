import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bot,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Heart,
  MessageSquare,
  Package,
  RotateCcw,
  Send,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  X,
} from 'lucide-react'
import { sendChatMessage } from '../api/chat'
import { useAuth } from '../hooks/useAuth'
import { useCart } from '../hooks/useCart'

const STATUS_COLORS = {
  pending_payment: 'bg-amber-50 text-amber-700 border-amber-200',
  placed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  packed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
}

const ChatBot = () => {
  const { user } = useAuth()
  const { cartItems, addItem } = useCart()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [showTeaser, setShowTeaser] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)
  const [addedItem, setAddedItem] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Initial welcome message
  useEffect(() => {
    const userName = user?.first_name || user?.username
    const welcomeText = user
      ? `Hi ${userName}! 👋 I am **ShopBot**, your Shopora personal assistant. I can track your orders, check your cart, find active coupon codes, and recommend products.`
      : 'Hello! 👋 Welcome to Shopora. I am **ShopBot**, your personal shopping assistant. Ask me about our products, deals, shipping policies, or track an order!'

    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: welcomeText,
        type: 'greeting',
        data: {},
        quickReplies: user
          ? ['📦 Track Latest Order', '🛒 Check My Cart', '🏷️ Active Coupons', '🚚 Shipping Policy', '❤️ My Wishlist']
          : ['🔥 Trending Products', '🏷️ Active Coupons', '🚚 Shipping Policy', '🔐 Log In to Track Order'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
  }, [user])

  // Listen for custom trigger events from other pages (e.g. Home page banner)
  useEffect(() => {
    const handleOpenChat = event => {
      setIsOpen(true)
      setShowTeaser(false)
      const action = event.detail?.action
      const message = event.detail?.message
      if (action || message) {
        setTimeout(() => {
          submitMessage({ text: message || '', action })
        }, 150)
      }
    }
    window.addEventListener('open-chatbot', handleOpenChat)
    return () => window.removeEventListener('open-chatbot', handleOpenChat)
  }, [cartItems])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  // Hide teaser greeting bubble after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowTeaser(false), 12000)
    return () => clearTimeout(timer)
  }, [])

  const submitMessage = async ({ text = '', action = null }) => {
    const trimmed = text.trim()
    if (!trimmed && !action) return

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed || (action ? action.replace('_', ' ') : ''),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await sendChatMessage({
        message: trimmed,
        action,
        cart: cartItems,
      })

      const botMsg = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: response.reply,
        type: response.type,
        data: response.data || {},
        quickReplies: response.quick_replies || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }

      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      console.error('ChatBot connection error:', err)
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: "I'm having a little trouble connecting right now. Please try again or browse our shop!",
          quickReplies: ['🔥 Trending Products', '🚚 Shipping Policy'],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = e => {
    e.preventDefault()
    submitMessage({ text: input })
  }

  const handleCopyCoupon = code => {
    navigator.clipboard?.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const handleAddToCart = product => {
    addItem({
      variantId: product.id,
      name: product.name,
      price: Number(product.price),
      stock: 10,
      image: product.image,
      storeId: product.store_id || 1,
      storeName: product.store || 'Shopora Official',
    })
    setAddedItem(product.id)
    setTimeout(() => setAddedItem(null), 2000)
  }

  const handleQuickReply = reply => {
    if (reply.includes('Log In')) {
      navigate('/login')
      setIsOpen(false)
      return
    }
    if (reply.includes('Cart Page')) {
      navigate('/cart')
      setIsOpen(false)
      return
    }
    if (reply.includes('Wishlist Page')) {
      navigate('/wishlist')
      setIsOpen(false)
      return
    }

    let action = null
    const lower = reply.toLowerCase()
    if (lower.includes('track') || lower.includes('latest order')) action = 'latest_order'
    else if (lower.includes('my orders') || lower.includes('all orders')) action = 'my_orders'
    else if (lower.includes('cart')) action = 'my_cart'
    else if (lower.includes('coupon') || lower.includes('discount')) action = 'coupons'
    else if (lower.includes('trending') || lower.includes('top rated')) action = 'trending_products'
    else if (lower.includes('shipping')) action = 'shipping_policy'
    else if (lower.includes('wishlist')) action = 'wishlist'

    submitMessage({ text: reply, action })
  }

  // Format bold markdown text
  const renderFormattedText = text => {
    if (!text) return null
    const parts = text.split('\n')
    return (
      <div className="space-y-1.5 text-sm leading-relaxed">
        {parts.map((p, idx) => {
          if (!p.trim()) return <div key={idx} className="h-1" />
          // Replace **bold**
          const boldFormatted = p.split(/(\*\*.*?\*\*)/g).map((seg, sIdx) => {
            if (seg.startsWith('**') && seg.endsWith('**')) {
              return <strong key={sIdx} className="font-semibold text-ink-900">{seg.slice(2, -2)}</strong>
            }
            return seg
          })
          return <p key={idx}>{boldFormatted}</p>
        })}
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Teaser Greeting Bubble when widget is closed */}
      {!isOpen && showTeaser && (
        <div className="mb-3 flex max-w-xs items-center gap-2.5 rounded-2xl border border-brand-200 bg-white p-3.5 shadow-xl shadow-brand-900/10 transition-all animate-bounce">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-lg">🤖</span>
          <div className="flex-1 cursor-pointer" onClick={() => { setIsOpen(true); setShowTeaser(false) }}>
            <p className="text-xs font-bold text-ink-900">
              {user ? `Hi ${user.first_name || user.username}! Need help?` : 'Need shopping assistance?'}
            </p>
            <p className="text-[11px] text-ink-500">Track orders, check cart or get coupons!</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowTeaser(false) }}
            className="text-ink-400 hover:text-ink-700"
            aria-label="Close teaser"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setShowTeaser(false) }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-400 text-white shadow-xl shadow-brand-500/35 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-brand-500/50"
          aria-label="Open ShopBot Shopping Assistant"
        >
          <Bot className="h-7 w-7 transition-transform group-hover:rotate-12" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </span>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && (
        <div className="flex h-[600px] max-h-[85vh] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-ink-900/20 backdrop-blur-lg transition-all animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
                <Bot className="h-6 w-6 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-brand-700 bg-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-sm font-bold tracking-tight">ShopBot Assistant</h3>
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                </div>
                <p className="flex items-center gap-1 text-[11px] text-brand-100">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {user ? `Helping ${user.first_name || user.username}` : 'Instant Support & Deals'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMessages([
                    {
                      id: 'reset',
                      sender: 'bot',
                      text: `Conversation restarted. How can I help you right now?`,
                      quickReplies: user
                        ? ['📦 Track Latest Order', '🛒 Check My Cart', '🏷️ Active Coupons']
                        : ['🔥 Trending Products', '🏷️ Active Coupons', '🚚 Shipping Policy'],
                      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    },
                  ])
                }}
                title="Restart chat"
                className="rounded-xl p-1.5 text-brand-100 transition hover:bg-white/10 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-brand-100 transition hover:bg-white/10 hover:text-white"
                aria-label="Minimize ChatBot"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-2 max-w-[88%]">
                  {msg.sender === 'bot' && (
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs font-bold">
                      🤖
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 shadow-sm ${
                      msg.sender === 'user'
                        ? 'bg-brand-600 text-white rounded-br-xs'
                        : 'bg-white text-ink-800 border border-slate-200/70 rounded-bl-xs'
                    }`}
                  >
                    {renderFormattedText(msg.text)}

                    {/* Rich Order Detail Card */}
                    {msg.type === 'order_detail' && msg.data?.order && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-ink-800">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div>
                            <span className="text-[11px] font-bold text-ink-400 uppercase tracking-wider">Order</span>
                            <p className="font-display text-sm font-extrabold text-ink-900">#{msg.data.order.id}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[msg.data.order.status] || 'bg-slate-100'}`}>
                            {msg.data.order.status_label}
                          </span>
                        </div>

                        <div className="mt-2 space-y-1.5 text-xs">
                          <p className="text-ink-600"><span className="font-semibold text-ink-700">Total:</span> ₹{msg.data.order.total}</p>
                          <p className="text-ink-600"><span className="font-semibold text-ink-700">Placed:</span> {msg.data.order.created_at}</p>
                          {msg.data.order.ship_to && (
                            <p className="text-ink-600 truncate"><span className="font-semibold text-ink-700">Deliver to:</span> {msg.data.order.ship_to}</p>
                          )}
                        </div>

                        {/* Order items preview */}
                        {msg.data.order.items?.length > 0 && (
                          <div className="mt-2 border-t border-slate-200/80 pt-2">
                            <p className="text-[11px] font-bold text-ink-500 mb-1">Items ({msg.data.order.items.length}):</p>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {msg.data.order.items.map((item, iIdx) => (
                                <div key={iIdx} className="flex items-center gap-2 text-xs">
                                  {item.image && (
                                    <img src={item.image} alt={item.product_name} className="h-6 w-6 rounded object-cover" />
                                  )}
                                  <span className="flex-1 truncate font-medium text-ink-800">{item.product_name}</span>
                                  <span className="text-ink-500 text-[11px]">x{item.qty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                          <Link
                            to={`/orders/${msg.data.order.id}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-800"
                          >
                            View Order Timeline <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Rich Orders List Card */}
                    {msg.type === 'orders_list' && msg.data?.orders?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.data.orders.map(order => (
                          <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-ink-900">Order #{order.id}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_COLORS[order.status] || 'bg-slate-100'}`}>
                                {order.status_label}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-ink-600">
                              <span>₹{order.total} ({order.items_count} items)</span>
                              <Link
                                to={`/orders/${order.id}`}
                                onClick={() => setIsOpen(false)}
                                className="font-bold text-brand-600 hover:underline"
                              >
                                Details →
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rich Product Cards */}
                    {msg.type === 'product_cards' && msg.data?.products?.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {msg.data.products.map(product => (
                          <div
                            key={product.id}
                            className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-brand-300"
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-12 w-12 flex-shrink-0 rounded-xl bg-slate-100 object-contain p-1"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-xs font-bold text-ink-900">{product.name}</p>
                              <div className="flex items-center gap-2 text-[11px] text-ink-500">
                                <span className="font-bold text-brand-700">₹{product.price}</span>
                                {product.rating > 0 && (
                                  <span className="text-amber-600 font-semibold">⭐ {product.rating}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Link
                                to={`/products/${product.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg bg-slate-100 px-2 py-1 text-center text-[10px] font-bold text-ink-700 hover:bg-slate-200"
                              >
                                View
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rich Coupon Cards */}
                    {msg.type === 'coupons' && msg.data?.coupons?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.data.coupons.map(coupon => (
                          <div
                            key={coupon.code}
                            className="flex items-center justify-between rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-2.5"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5 text-brand-600" />
                                <span className="font-mono text-xs font-extrabold text-brand-800">{coupon.code}</span>
                              </div>
                              <p className="text-[11px] text-ink-600 mt-0.5">{coupon.description}</p>
                            </div>
                            <button
                              onClick={() => handleCopyCoupon(coupon.code)}
                              className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-brand-700 shadow-sm border border-brand-200 hover:bg-brand-50"
                            >
                              {copiedCode === coupon.code ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rich Cart Summary Card */}
                    {msg.type === 'cart_summary' && (
                      <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <Link
                          to="/cart"
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Open My Cart
                        </Link>
                        {msg.data?.count > 0 && (
                          <Link
                            to="/checkout"
                            onClick={() => setIsOpen(false)}
                            className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white shadow hover:opacity-90"
                          >
                            Checkout →
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Wishlist items */}
                    {msg.type === 'wishlist' && msg.data?.items?.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.data.items.map(item => (
                          <Link
                            key={item.id}
                            to={`/products/${item.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 text-xs text-ink-800"
                          >
                            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                            <span className="flex-1 truncate font-medium">{item.name}</span>
                            <span className="font-bold text-brand-700">₹{item.price}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Reply Chips below bot message */}
                {msg.sender === 'bot' && msg.quickReplies?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-8">
                    {msg.quickReplies.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleQuickReply(chip)}
                        className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-2xs transition hover:border-brand-400 hover:bg-brand-50 hover:scale-105 active:scale-95"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                <span className="mt-1 px-1 text-[10px] text-ink-400">{msg.time}</span>
              </div>
            ))}

            {/* Typing Indicator */}
            {loading && (
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 text-xs">
                  🤖
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-xs border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-brand-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="border-t border-slate-200/80 bg-white p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/20">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about orders, cart, deals..."
                className="flex-1 bg-transparent text-xs text-ink-900 placeholder-ink-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white transition hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-ink-400">
              <span>ShopBot AI • Real-time customer data</span>
              <span>Press Enter ↵</span>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default ChatBot
