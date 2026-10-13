from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """What React gets about the logged-in user (never the password)."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role']

    name = serializers.CharField(source='first_name')


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate_password(self, value):
        validate_password(value)  # Django's built-in rules (not too common, not all numbers…)
        return value

    def create(self, data):
        # New sign-ups are ALWAYS customers. Only an admin can make staff/admin.
        return User.objects.create_user(
            username=data['email'],
            email=data['email'],
            password=data['password'],  # create_user HASHES the password
            first_name=data['name'],
            role=User.Role.CUSTOMER,
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        # authenticate() checks the hashed password for us
        user = authenticate(username=data['email'].lower(), password=data['password'])
        if not user:
            raise serializers.ValidationError('Wrong email or password.')
        data['user'] = user
        return data
