"""Razorpay (test mode) helpers.

If RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set in .env → real Razorpay test checkout.
If not → 'mock' mode: a fake payment screen for development.
"""
import base64
import hashlib
import hmac
import json
import urllib.request

from django.conf import settings


def payment_mode():
    return 'razorpay' if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET else 'mock'


def to_paise(amount):
    return int(amount * 100)  # Razorpay works in paise: ₹499.50 → 49950


def create_razorpay_order(amount, receipt):
    """Ask Razorpay to create an order. Returns the Razorpay order id (e.g. 'order_Abc123')."""
    credentials = f'{settings.RAZORPAY_KEY_ID}:{settings.RAZORPAY_KEY_SECRET}'.encode()
    request = urllib.request.Request(
        'https://api.razorpay.com/v1/orders',
        data=json.dumps({'amount': to_paise(amount), 'currency': 'INR', 'receipt': receipt}).encode(),
        headers={
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + base64.b64encode(credentials).decode(),
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.load(response)['id']


def verify_signature(razorpay_order_id, razorpay_payment_id, signature):
    """Razorpay signs "order_id|payment_id" with OUR secret key.

    Only someone who knows the secret (Razorpay and our server) can make this signature,
    so a user cannot fake a "payment success" from the browser.
    """
    message = f'{razorpay_order_id}|{razorpay_payment_id}'.encode()
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature or '')
