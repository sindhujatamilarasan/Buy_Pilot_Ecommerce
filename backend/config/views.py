from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health(request):
    """Simple check that the API is running – React calls this on the home page."""
    return Response({'status': 'ok', 'message': 'Django API is running'})
