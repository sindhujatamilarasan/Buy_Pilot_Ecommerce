from rest_framework import serializers


class QuoteItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=99)


class QuoteSerializer(serializers.Serializer):
    items = QuoteItemSerializer(many=True, allow_empty=True, max_length=50)
    coupon_code = serializers.CharField(required=False, allow_blank=True, max_length=30)


def quote_to_json(quote):
    """Remove model objects so the quote can be sent as JSON."""
    return {
        'lines': [{k: v for k, v in line.items() if k != 'variant'} for line in quote['lines']],
        'problems': quote['problems'],
        'summary': quote['summary'],
        'coupon': {'code': quote['coupon'].code} if quote['coupon'] else None,
        'coupon_error': quote['coupon_error'],
    }
