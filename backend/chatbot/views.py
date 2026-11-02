from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .services import handle_chat


@api_view(['POST'])
@permission_classes([AllowAny])
def chat_message(request):
    """Chat endpoint supporting both logged-in customers and guest visitors.

    Request payload:
    {
        "message": "Where is my order?",
        "action": "latest_order",      # optional direct intent
        "cart": [{"variant_id": 1, "name": "...", "price": 499, "qty": 1}] # optional live cart
    }
    """
    message = request.data.get('message', '')
    action = request.data.get('action')
    client_cart = request.data.get('cart', [])

    response_data = handle_chat(
        message=message,
        action=action,
        user=request.user,
        client_cart=client_cart,
    )
    return Response(response_data, status=status.HTTP_200_OK)
