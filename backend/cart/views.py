from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import QuoteSerializer, quote_to_json
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
