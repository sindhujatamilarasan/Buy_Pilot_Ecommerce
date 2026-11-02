"""Chatbot intelligent assistant service.
Extracts real customer data (orders, cart, wishlist, coupons, address) and provides
contextual responses with rich structured data for interactive cards.
"""
from decimal import Decimal
import re
from django.db.models import Min, Q
from django.utils import timezone

from catalog.models import Category, Product, WishlistItem
from coupons.models import Coupon, CouponUsage
from orders.models import Address, Order


def get_customer_orders(user, limit=5):
    """Retrieve recent orders for authenticated customer with details."""
    if not user or not user.is_authenticated:
        return []
    
    orders = (
        Order.objects.filter(user=user)
        .prefetch_related('items', 'logs')
        .order_by('-created_at')[:limit]
    )
    result = []
    for o in orders:
        items_data = [
            {
                'product_name': item.product_name,
                'variant_label': item.variant_label,
                'image': item.image,
                'price': str(item.price),
                'qty': item.qty,
                'line_total': str(item.line_total),
            }
            for item in o.items.all()
        ]
        logs_data = [
            {
                'status': log.status,
                'status_label': log.get_status_display(),
                'note': log.note,
                'created_at': log.created_at.strftime('%d %b %Y, %I:%M %p'),
            }
            for log in o.logs.all()
        ]
        result.append({
            'id': o.id,
            'status': o.status,
            'status_label': o.get_status_display(),
            'payment_status': o.payment_status,
            'payment_status_label': o.get_payment_status_display(),
            'total': str(o.total),
            'subtotal': str(o.subtotal),
            'shipping': str(o.shipping),
            'discount': str(o.discount),
            'coupon_code': o.coupon_code,
            'items_count': sum(i['qty'] for i in items_data),
            'items': items_data,
            'logs': logs_data,
            'ship_to': f'{o.ship_name}, {o.ship_city} - {o.ship_pincode}',
            'created_at': o.created_at.strftime('%d %b %Y, %I:%M %p'),
        })
    return result


def get_active_coupons(user=None):
    """Fetch active valid coupons, filtering out ones the customer already used."""
    now = timezone.now()
    qs = Coupon.objects.filter(is_active=True).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=now)
    )
    if user and user.is_authenticated:
        used_ids = CouponUsage.objects.filter(user=user).values_list('coupon_id', flat=True)
        qs = qs.exclude(id__in=used_ids)
    
    coupons = []
    for c in qs[:6]:
        discount_display = f'₹{c.value:.0f} OFF' if c.type == Coupon.Type.FLAT else f'{c.value:.0f}% OFF'
        coupons.append({
            'code': c.code,
            'type': c.type,
            'value': str(c.value),
            'discount_display': discount_display,
            'min_order': str(c.min_order),
            'description': f'{discount_display} on orders above ₹{c.min_order:.0f}' if c.min_order > 0 else f'{discount_display} on all orders',
        })
    return coupons


def get_customer_wishlist(user):
    """Fetch customer's wishlisted items."""
    if not user or not user.is_authenticated:
        return []
    items = (
        WishlistItem.objects.filter(user=user)
        .select_related('product__store')
        .prefetch_related('product__images', 'product__variants')[:6]
    )
    result = []
    for w in items:
        p = w.product
        first_img = p.images.first()
        min_variant = p.variants.first()
        result.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'image': first_img.path if first_img else '',
            'price': str(min_variant.price) if min_variant else '0',
            'store': p.store.name,
        })
    return result


def search_products(query, limit=4):
    """Search catalog for matching products."""
    products = (
        Product.objects.filter(
            Q(name__icontains=query) | Q(description__icontains=query) | Q(category__name__icontains=query),
            is_active=True,
            store__is_active=True
        )
        .select_related('category', 'store')
        .prefetch_related('images', 'variants')
        .annotate(min_price=Min('variants__price'))
        .order_by('-rating', 'min_price')[:limit]
    )
    result = []
    for p in products:
        first_img = p.images.first()
        min_variant = p.variants.first()
        result.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'rating': str(p.rating),
            'image': first_img.path if first_img else '',
            'price': str(min_variant.price) if min_variant else '0',
            'store': p.store.name,
            'category': p.category.name,
        })
    return result


def get_trending_products(limit=4):
    """Fetch top-rated products."""
    products = (
        Product.objects.filter(is_active=True, store__is_active=True)
        .select_related('category', 'store')
        .prefetch_related('images', 'variants')
        .order_by('-rating')[:limit]
    )
    result = []
    for p in products:
        first_img = p.images.first()
        min_variant = p.variants.first()
        result.append({
            'id': p.id,
            'name': p.name,
            'slug': p.slug,
            'rating': str(p.rating),
            'image': first_img.path if first_img else '',
            'price': str(min_variant.price) if min_variant else '0',
            'store': p.store.name,
            'category': p.category.name,
        })
    return result


def handle_chat(message='', action=None, user=None, client_cart=None):
    """Main conversational entry point."""
    msg = (message or '').strip()
    msg_lower = msg.lower()
    is_auth = user is not None and user.is_authenticated
    user_name = user.first_name or user.username if is_auth else 'there'
    
    # 1. ACTION: Specific quick button clicks
    if action == 'latest_order' or (is_auth and any(k in msg_lower for k in ['my latest order', 'track latest', 'last order'])):
        if not is_auth:
            return {
                'reply': 'Please log in to view your recent orders and track their delivery.',
                'type': 'auth_prompt',
                'data': {},
                'quick_replies': ['Log In / Register', 'Active Coupons', 'Trending Products', 'Help']
            }
        orders = get_customer_orders(user, limit=1)
        if not orders:
            return {
                'reply': f"You don't have any orders yet, {user_name}. Check out our trending products to place your first order!",
                'type': 'empty_orders',
                'data': {'products': get_trending_products(4)},
                'quick_replies': ['Browse Trending', 'Active Coupons', 'Free Shipping Policy']
            }
        order = orders[0]
        return {
            'reply': f"Here is your latest order **#{order['id']}** placed on {order['created_at']}. Current status: **{order['status_label']}** 📦",
            'type': 'order_detail',
            'data': {'order': order},
            'quick_replies': ['View All My Orders', 'Check My Cart', 'Active Coupons', 'Need Help?']
        }

    if action == 'my_orders' or (is_auth and any(k in msg_lower for k in ['my orders', 'show my orders', 'all orders', 'past orders'])):
        if not is_auth:
            return {
                'reply': 'Please log in to see all your orders and delivery history.',
                'type': 'auth_prompt',
                'data': {},
                'quick_replies': ['Log In / Register', 'Active Coupons', 'Shipping Info']
            }
        orders = get_customer_orders(user, limit=5)
        if not orders:
            return {
                'reply': f"You haven't placed any orders yet, {user_name}.",
                'type': 'empty_orders',
                'data': {'products': get_trending_products(4)},
                'quick_replies': ['Browse Products', 'Active Coupons']
            }
        return {
            'reply': f"Found {len(orders)} recent order(s) for your account:",
            'type': 'orders_list',
            'data': {'orders': orders},
            'quick_replies': ['Track Latest Order', 'Check My Cart', 'Active Coupons']
        }

    # Order ID specific lookup (e.g. "order 1", "track #5", "where is order 12")
    order_id_match = re.search(r'(?:order|#)\s*(\d+)', msg_lower)
    if order_id_match:
        target_id = int(order_id_match.group(1))
        if is_auth:
            matched_order = Order.objects.filter(id=target_id, user=user).prefetch_related('items', 'logs').first()
            if matched_order:
                orders_data = get_customer_orders(user, limit=10)
                curr = next((o for o in orders_data if o['id'] == target_id), None)
                if curr:
                    return {
                        'reply': f"Here are the details for Order **#{target_id}** ({curr['status_label']}):",
                        'type': 'order_detail',
                        'data': {'order': curr},
                        'quick_replies': ['My Orders', 'Check My Cart', 'Need Help?']
                    }
            return {
                'reply': f"I couldn't find Order #{target_id} under your account ({user.email}). Please verify the order number in your Orders page.",
                'type': 'text',
                'data': {},
                'quick_replies': ['View My Orders', 'Contact Support']
            }
        else:
            return {
                'reply': f"To check Order #{target_id}, please log in so we can verify your account securely.",
                'type': 'auth_prompt',
                'data': {'target_order_id': target_id},
                'quick_replies': ['Log In', 'Shipping Info', 'Trending Products']
            }

    # Generic tracking intent
    if any(k in msg_lower for k in ['track', 'where is my order', 'delivery status', 'shipment', 'tracking']):
        if is_auth:
            orders = get_customer_orders(user, limit=1)
            if orders:
                order = orders[0]
                return {
                    'reply': f"Tracking your most recent order **#{order['id']}**:\n\n• Status: **{order['status_label']}**\n• Deliver to: {order['ship_to']}\n• Total: ₹{order['total']}",
                    'type': 'order_detail',
                    'data': {'order': order},
                    'quick_replies': ['View All Orders', 'Order Cancellation Policy', 'Help']
                }
            return {
                'reply': f"You don't have any active orders to track right now, {user_name}.",
                'type': 'text',
                'data': {},
                'quick_replies': ['Browse Products', 'Active Coupons']
            }
        else:
            return {
                'reply': "Please log in to track your orders in real-time with full step-by-step timeline updates.",
                'type': 'auth_prompt',
                'data': {},
                'quick_replies': ['Log In', 'Browse Products', 'Shipping Info']
            }

    # 2. CART SUMMARY INTENT
    if action == 'my_cart' or any(k in msg_lower for k in ['my cart', 'in my cart', 'cart items', 'show cart', 'cart value', 'what is in my cart']):
        # If client passed items, use client_cart; otherwise check if logged-in user has DB cart
        items = client_cart or []
        if isinstance(items, dict):
            items = list(items.values())
        safe_items = [i for i in items if isinstance(i, dict)]
        def _to_dec(val):
            try:
                return Decimal(str(val)) if val not in (None, '') else Decimal('0')
            except Exception:
                return Decimal('0')
        count = sum(int(i.get('qty', 1) or 1) for i in safe_items)
        subtotal = sum(_to_dec(i.get('price', 0)) * int(i.get('qty', 1) or 1) for i in safe_items)
        free_shipping_min = Decimal('500')
        needed_for_free = max(Decimal('0'), free_shipping_min - subtotal)
        
        shipping_msg = "🎉 You've unlocked **FREE Delivery**!" if subtotal >= free_shipping_min and count > 0 else (
            f"Add ₹{needed_for_free:.0f} more to your cart to get **FREE Delivery**! (Standard shipping ₹49)" if count > 0 else "Free delivery on orders ₹500 or more."
        )

        reply_text = f"You have **{count} item(s)** in your cart (Subtotal: ₹{subtotal:.2f}).\n\n{shipping_msg}" if count > 0 else "Your cart is currently empty. Discover our top products below:"
        
        return {
            'reply': reply_text,
            'type': 'cart_summary',
            'data': {
                'count': count,
                'subtotal': str(subtotal),
                'items': items,
                'shipping_msg': shipping_msg,
                'products': get_trending_products(4) if count == 0 else []
            },
            'quick_replies': ['Go to Cart Page', 'Active Coupons', 'Trending Products'] if count > 0 else ['Trending Products', 'Active Coupons']
        }

    # 3. COUPONS & DISCOUNTS INTENT
    if action == 'coupons' or any(k in msg_lower for k in ['coupon', 'discount', 'promo', 'offer', 'voucher', 'deal', 'save']):
        coupons = get_active_coupons(user)
        if coupons:
            return {
                'reply': f"Here are the active coupon codes available for you today! Click **Copy** to apply at checkout:",
                'type': 'coupons',
                'data': {'coupons': coupons},
                'quick_replies': ['Check My Cart', 'Browse Products', 'Free Shipping Info']
            }
        return {
            'reply': "There are no new active coupons right now, but you still enjoy automatic **FREE Shipping** on orders of ₹500 or more!",
            'type': 'text',
            'data': {},
            'quick_replies': ['Trending Products', 'Check My Cart']
        }

    # 4. WISHLIST INTENT
    if action == 'wishlist' or any(k in msg_lower for k in ['wishlist', 'saved items', 'favorites', 'saved for later']):
        if not is_auth:
            return {
                'reply': 'Please log in to view and manage your saved wishlist items ❤️.',
                'type': 'auth_prompt',
                'data': {},
                'quick_replies': ['Log In', 'Trending Products']
            }
        wishlist = get_customer_wishlist(user)
        if wishlist:
            return {
                'reply': f"You have **{len(wishlist)} item(s)** saved in your wishlist ❤️:",
                'type': 'wishlist',
                'data': {'items': wishlist},
                'quick_replies': ['Go to Wishlist Page', 'Check My Cart', 'Trending Products']
            }
        return {
            'reply': f"Your wishlist is empty, {user_name}. Click the ❤️ icon on any product to save it here for later!",
            'type': 'text',
            'data': {'products': get_trending_products(4)},
            'quick_replies': ['Browse Trending', 'Active Coupons']
        }

    # 5. ADDRESS / SHIPPING DESTINATION INTENT
    if any(k in msg_lower for k in ['my address', 'saved address', 'delivery address', 'where do you deliver', 'deliver to']):
        if is_auth:
            addresses = Address.objects.filter(user=user)
            default_addr = addresses.filter(is_default=True).first() or addresses.first()
            if default_addr:
                return {
                    'reply': f"Your default delivery address is:\n\n**{default_addr.name}**\n{default_addr.address}, {default_addr.city} - {default_addr.pincode}\n📞 {default_addr.phone}",
                    'type': 'address',
                    'data': {
                        'address': {
                            'name': default_addr.name,
                            'city': default_addr.city,
                            'pincode': default_addr.pincode,
                            'full': f'{default_addr.address}, {default_addr.city} - {default_addr.pincode}',
                        }
                    },
                    'quick_replies': ['Track My Order', 'Check My Cart', 'Manage Addresses']
                }
            return {
                'reply': f"You don't have any saved addresses yet. You can add one during checkout or in your Account settings.",
                'type': 'text',
                'data': {},
                'quick_replies': ['Add Address in Account', 'Browse Products']
            }
        else:
            return {
                'reply': "We deliver across all serviceable pincodes in India! Deliveries typically arrive in 2–4 business days.",
                'type': 'text',
                'data': {},
                'quick_replies': ['Shipping Policy', 'Trending Products', 'Log In']
            }

    # 6. SHIPPING & DELIVERY POLICY INTENT
    if action == 'shipping_policy' or any(k in msg_lower for k in ['shipping charges', 'shipping fee', 'delivery fee', 'shipping cost', 'free shipping', 'when will i receive']):
        return {
            'reply': "🚚 **ShopKart Delivery Policy**:\n\n• **FREE Delivery**: On all orders of **₹500 or more**.\n• **Standard Shipping**: ₹49 flat fee for orders under ₹500.\n• **Delivery Speed**: 2 to 4 business days with end-to-end status tracking.\n• **Taxes**: All prices include 18% GST.",
            'type': 'faq',
            'data': {},
            'quick_replies': ['Active Coupons', 'Trending Products', 'Track My Order']
        }

    # 7. CANCELLATION & RETURNS INTENT
    if action == 'cancellation_policy' or any(k in msg_lower for k in ['cancel', 'cancellation', 'return', 'refund', 'exchange']):
        return {
            'reply': "🔄 **Cancellations & Refunds Policy**:\n\n• **Easy Cancellation**: You can cancel your order any time **before it is marked as Shipped** from your Order Details page.\n• **Instant Stock Restoration**: Items are immediately placed back into inventory.\n• **Refunds**: Payments made via Razorpay or card are refunded back to your original source account within 5–7 business days.",
            'type': 'faq',
            'data': {},
            'quick_replies': ['View My Orders', 'Shipping Info', 'Contact Support']
        }

    # 8. PAYMENT METHODS INTENT
    if any(k in msg_lower for k in ['payment method', 'how to pay', 'razorpay', 'upi', 'credit card', 'net banking', 'cash on delivery', 'cod']):
        return {
            'reply': "💳 **Payment Options**:\n\n• We accept **UPI** (Google Pay, PhonePe, Paytm), **Credit/Debit Cards** (Visa, MasterCard, RuPay), and **Net Banking** powered securely by Razorpay.\n• In developer/test mode, a convenient mock payment simulator allows instant test verification.",
            'type': 'faq',
            'data': {},
            'quick_replies': ['Check My Cart', 'Active Coupons', 'Trending Products']
        }

    # 9. MULTI-STORE / SELLER INTENT
    if any(k in msg_lower for k in ['seller', 'store', 'urban threads', 'shopkart official', 'multi-vendor', 'who is selling']):
        return {
            'reply': "🏪 **Marketplace Sellers**:\n\nShopKart hosts verified marketplace stores including **ShopKart Official** and **Urban Threads**.\n\n*Note*: To ensure smooth packing and shipping, checkout is completed for **one store per order**. Any items from another store can be saved for later with 1 click!",
            'type': 'faq',
            'data': {},
            'quick_replies': ['Browse Products', 'Active Coupons', 'Check My Cart']
        }

    # 10. PRODUCT SEARCH OR RECOMMENDATIONS
    if action == 'trending_products' or any(k in msg_lower for k in ['trending', 'top rated', 'popular', 'best sellers', 'recommend']):
        products = get_trending_products(4)
        return {
            'reply': "Here are our **top-rated products** that customers love ⭐:",
            'type': 'product_cards',
            'data': {'products': products},
            'quick_replies': ['Active Coupons', 'Check My Cart', 'Free Shipping Policy']
        }

    # Search for specific terms in catalog (e.g., "shoes", "watch", "shirt", "perfume", "electronics")
    # Clean query from filler words
    cleaned_query = re.sub(r'^(show\s+me|find|search|looking\s+for|do\s+you\s+have|where\s+are|buy)\s+', '', msg_lower).strip()
    if len(cleaned_query) >= 2:
        found_products = search_products(cleaned_query, limit=4)
        if found_products:
            return {
                'reply': f"Found {len(found_products)} product(s) matching **\"{cleaned_query}\"**:",
                'type': 'product_cards',
                'data': {'products': found_products},
                'quick_replies': ['Active Coupons', 'Check My Cart', 'View All Products']
            }

    # 11. GREETINGS & DEFAULT FALLBACK
    greeting_prefix = f"Hello {user_name}! 👋" if is_auth else "Hello there! 👋"
    return {
        'reply': f"{greeting_prefix} I am **KartBot**, your personal ShopKart assistant. How can I help you today?",
        'type': 'greeting',
        'data': {
            'is_authenticated': is_auth,
            'user_name': user_name,
            'trending': get_trending_products(3)
        },
        'quick_replies': [
            '📦 Track Latest Order' if is_auth else '🔥 Trending Products',
            '🛒 Check My Cart',
            '🏷️ Active Coupons',
            '🚚 Shipping Policy',
            '❤️ My Wishlist' if is_auth else '💬 Store Help'
        ]
    }
