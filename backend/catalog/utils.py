def absolute_media(request, path):
    """Uploaded images are stored as '/media/products/x.jpg' → make a full URL for React.
    Seed images are already full URLs (https://…) and are returned as they are."""
    if path and path.startswith('/') and request is not None:
        return request.build_absolute_uri(path)
    return path
