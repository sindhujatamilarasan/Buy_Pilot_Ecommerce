from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import Category, Product, ProductVariant


def make_product(category, name, price, rating):
    product = Product.objects.create(category=category, name=name, slug=name.lower(), rating=rating)
    ProductVariant.objects.create(product=product, sku=f'{name}-1', price=price, stock=5)
    return product


class FilterTests(APITestCase):
    def setUp(self):
        books = Category.objects.create(name='Books', slug='books')
        self.cheap = make_product(books, 'Cheap', 199, 3.5)
        self.mid = make_product(books, 'Mid', 999, 4.2)
        self.costly = make_product(books, 'Costly', 4999, 4.8)

    def names(self, query):
        return sorted(p['name'] for p in self.client.get(f'/api/products/?{query}').data['results'])

    def test_price_range(self):
        self.assertEqual(self.names('min_price=500&max_price=2000'), ['Mid'])

    def test_min_rating(self):
        self.assertEqual(self.names('min_rating=4'), ['Costly', 'Mid'])

    def test_invalid_numbers_are_ignored(self):
        self.assertEqual(len(self.names('min_price=abc')), 3)


class WishlistTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='w@t.com', email='w@t.com', password='Pass@12345')
        books = Category.objects.create(name='Books', slug='books')
        self.product = make_product(books, 'Novel', 299, 4.0)

    def test_needs_login(self):
        self.assertEqual(self.client.get('/api/wishlist/').status_code, 401)

    def test_add_list_remove(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/wishlist/', {'product_id': self.product.id}).status_code, 201)
        # Saving again is not an error and does not duplicate
        self.assertEqual(self.client.post('/api/wishlist/', {'product_id': self.product.id}).status_code, 200)
        self.assertEqual([p['name'] for p in self.client.get('/api/wishlist/').data], ['Novel'])
        self.assertEqual(self.client.delete(f'/api/wishlist/{self.product.id}/').status_code, 204)
        self.assertEqual(self.client.get('/api/wishlist/').data, [])


class UploadedImageUrlTests(APITestCase):
    """Uploaded images are saved as /media/… and must reach React as FULL urls on every API."""

    def setUp(self):
        from catalog.models import ProductImage
        self.user = User.objects.create_user(username='u@t.com', email='u@t.com', password='Pass@12345')
        books = Category.objects.create(name='Books', slug='books')
        self.product = make_product(books, 'Uploaded', 499, 4.0)
        ProductImage.objects.create(product=self.product, path='/media/products/x.webp')
        self.variant = self.product.variants.first()
        self.client.force_authenticate(self.user)

    def assertFullUrl(self, url):
        self.assertEqual(url, 'http://testserver/media/products/x.webp')

    def test_wishlist_image(self):
        self.client.post('/api/wishlist/', {'product_id': self.product.id})
        self.assertFullUrl(self.client.get('/api/wishlist/').data[0]['image'])

    def test_saved_cart_image(self):
        item = {'variant_id': self.variant.id, 'qty': 1, 'saved_for_later': False}
        self.assertFullUrl(self.client.put('/api/cart/', {'items': [item]}, format='json').data['items'][0]['image'])

    def test_quote_image(self):
        res = self.client.post('/api/cart/quote/', {'items': [{'variant_id': self.variant.id, 'qty': 1}]}, format='json')
        self.assertFullUrl(res.data['lines'][0]['image'])
