from rest_framework.test import APITestCase

from accounts.models import User
from stores.models import default_store_id

VALID = {
    'theme': 'ocean', 'announcement_enabled': False, 'announcement_text': 'Diwali sale!', 'hero_badge': '', 'hero_title': 'Big sale',
    'hero_highlight': 'up to 50% off', 'hero_subtitle': '', 'footer_tagline': 'Hi',
    'perks': [{'icon': '🚚', 'title': 'Fast delivery', 'text': '2 days'}],
    'footer_links': [{'group': 'Help', 'label': 'Orders', 'url': '/orders'},
                     {'group': 'Social', 'label': 'Instagram', 'url': 'https://instagram.com/shopkart'}],
}


class SiteContentTests(APITestCase):
    def setUp(self):
        self.boss = User.objects.create_user(username='b@t.com', email='b@t.com', password='x', role='superadmin')
        self.admin = User.objects.create_user(username='a@t.com', email='a@t.com', password='x', role='admin',
                                              store_id=default_store_id())

    def test_public_content_has_defaults_without_returns_promise(self):
        data = self.client.get('/api/site/').data
        self.assertEqual(len(data['perks']), 3)
        self.assertNotIn('return', data['announcement_text'].lower())
        self.assertEqual(data['footer_links'][0]['url'], '/products')

    def test_only_super_admin_can_edit(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put('/api/manage/site/', VALID, format='json').status_code, 403)
        self.client.force_authenticate(self.boss)
        self.assertEqual(self.client.put('/api/manage/site/', VALID, format='json').status_code, 200)
        data = self.client.get('/api/site/').data
        self.assertEqual((data['hero_title'], data['announcement_enabled'], len(data['perks'])), ('Big sale', False, 1))
        self.assertEqual(data['theme'], 'ocean')
        self.assertEqual([link['label'] for link in data['footer_links']], ['Orders', 'Instagram'])

    def test_unsafe_links_are_rejected_and_nothing_is_saved(self):
        self.client.force_authenticate(self.boss)
        for bad in ['javascript:alert(1)', '//evil.com', 'www.site.com']:
            payload = {**VALID, 'footer_links': [{'group': 'X', 'label': 'Bad', 'url': bad}]}
            self.assertEqual(self.client.put('/api/manage/site/', payload, format='json').status_code, 400, bad)
        self.assertEqual(len(self.client.get('/api/site/').data['footer_links']), 8)  # defaults untouched

    def test_only_known_themes_are_allowed(self):
        self.client.force_authenticate(self.boss)
        self.assertEqual(self.client.put('/api/manage/site/', {**VALID, 'theme': 'neon'}, format='json').status_code, 400)
        self.assertEqual(self.client.get('/api/site/').data['theme'], 'shopora')
