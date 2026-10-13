from rest_framework import serializers


class QuoteItemSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    qty = serializers.IntegerField(min_value=1, max_value=99)


class QuoteSerializer(serializers.Serializer):
    items = QuoteItemSerializer(many=True, allow_empty=True, max_length=50)
