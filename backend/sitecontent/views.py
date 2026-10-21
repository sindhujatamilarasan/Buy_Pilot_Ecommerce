from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.permissions import IsSuperAdmin

from .models import SiteSettings
from .serializers import SiteContentSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def site_content(request):
    """GET /api/site/ – what the shop shows in the strip, hero, perks and footer (public)."""
    return Response(SiteContentSerializer(SiteSettings.load()).data)


@api_view(['GET', 'PUT'])
@permission_classes([IsSuperAdmin])
def manage_site_content(request):
    """GET / PUT /api/manage/site/ – the super admin edits the shop texts and links."""
    site = SiteSettings.load()
    if request.method == 'GET':
        return Response(SiteContentSerializer(site).data)
    serializer = SiteContentSerializer(site, data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
