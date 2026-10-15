from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .cart_store import cart_payload, merge_cart, replace_cart
from .serializers import QuoteSerializer, SavedCartSerializer, quote_to_json
from .services import build_quote


@api_view(['POST'])
@permission_classes([AllowAny])  # guests can check their cart too
def quote(request):
    """POST /api/cart/quote/  { "items": [{ "variant_id": 5, "qty": 2 }], "coupon_code": "WELCOME10" }

    Recalculates the cart from the DATABASE prices – the frontend only sends ids and quantities,
    never prices. Also reports stock and coupon problems.
    """
    serializer = QuoteSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    result = build_quote(data['items'], data.get('coupon_code', ''), request.user)
    return Response(quote_to_json(result))


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def saved_cart(request):
    """GET /api/cart/ → the logged-in user's cart.
    PUT /api/cart/ { items: [{ variant_id, qty, saved_for_later }] } → replace it.
    """
    if request.method == 'GET':
        return Response(cart_payload(request.user))
    serializer = SavedCartSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(replace_cart(request.user, serializer.validated_data['items']))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def merge(request):
    """POST /api/cart/merge/ { items: […guest cart…] } → called once right after login."""
    serializer = SavedCartSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    return Response(merge_cart(request.user, serializer.validated_data['items']))
