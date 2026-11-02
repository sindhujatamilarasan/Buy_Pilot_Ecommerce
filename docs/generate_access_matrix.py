"""Generate docs/User_Access_Matrix.xlsx (and an HTML copy used for the PNG screenshot).

The permissions below were taken from the IMPLEMENTED code:
  backend  → permission classes in accounts/permissions.py and each view (IsSuperAdmin, IsAdminRole,
             IsStaffOrAdmin, IsAuthenticated, AllowAny) + for_my_store() store filtering
  frontend → <ProtectedRoute roles=…> in src/App.jsx and the sidebar MENU in src/layouts/AdminLayout.jsx

When a permission changes in the code, update the data here and run:
    pip install openpyxl
    python docs/generate_access_matrix.py
"""
from datetime import date
from html import escape
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

DOCS = Path(__file__).resolve().parent
ROLES = ['Guest', 'Customer', 'Staff', 'Store Admin', 'Super Admin']
PERMISSIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export']

# ---------------------------------------------------------------------------------------------
# 1. Summary matrix (like the example): one short text per module and role
# ---------------------------------------------------------------------------------------------
NO = 'No Access'
LOGIN = 'No Access (login required)'
SHOPPER_NOTE = 'own account'  # staff / admins can also shop with their own account

SUMMARY = [
    # module, area, guest, customer, staff, store admin, super admin
    ('Shop – products & categories', 'Shop', 'View', 'View', 'View', 'View', 'View'),
    ('Site content (banner, hero, perks, footer)', 'Shop', 'View', 'View', 'View', 'View', 'View / Edit'),
    ('Cart', 'Shop', 'View / Create / Edit / Delete (in browser)', 'View / Create / Edit / Delete (saved to account)',
     f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})'),
    ('Wishlist', 'Shop', LOGIN, 'View / Create / Delete (own)',
     f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})'),
    ('Checkout & payment', 'Shop', LOGIN, 'Create order · Apply coupon · Pay / Retry',
     f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})'),
    ('My orders', 'Account', LOGIN, 'View · Cancel before shipping (own)',
     f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})'),
    ('My account – profile, password, addresses', 'Account', LOGIN,
     'View / Edit (own) · Addresses: Create / Edit / Delete',
     f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})', f'Same as customer ({SHOPPER_NOTE})'),
    ('Admin dashboard', 'Admin', NO, NO, NO, 'View (own store)', 'View (all stores)'),
    ('Sales reports', 'Admin', NO, NO, NO, 'View (own store)', 'View (all stores)'),
    ('Products, variants, stock & photos', 'Admin', NO, NO, NO, 'Full Access (own store)', 'Full Access (all stores)'),
    ('Categories', 'Admin', NO, NO, NO, 'View / Create', 'Full Access'),
    ('Order management', 'Admin', NO, NO, 'View · Update status (own store)',
     'View · Update status · Cancel (own store)', 'View · Update status · Cancel (all stores)'),
    ('User management', 'Admin', NO, NO, NO, 'View · Create staff · Remove staff access (own store)',
     'View · Change admin/staff role · Remove access'),
    ('Coupons', 'Admin', LOGIN, 'Apply at checkout only', NO, NO, 'Full Access'),
    ('Stores', 'Admin', NO, NO, NO, NO, 'View / Create / Edit · Add store admins'),
    ('Site content editor', 'Admin', NO, NO, NO, NO, 'View / Edit'),
    ('Django admin site (/admin)', 'System', NO, NO, NO, NO, 'Full Access'),
]

# ---------------------------------------------------------------------------------------------
# 2. Detailed matrix: every module × permission type. Cell = scope text, or '' = not allowed.
#    "Own" = only their own records · "Own store" = only their store · "All stores" = everything
# ---------------------------------------------------------------------------------------------
def perms(**granted):
    """perms(View='Own', Create='Own') → {'View': 'Own', 'Create': 'Own', 'Edit': '', …}"""
    return {p: granted.get(p, '') for p in PERMISSIONS}


SHOPPER = 'Own account'
DETAILED = [
    # module, {role: perms}, other actions, where it is enforced
    ('Shop – products & categories', {
        r: perms(View='Yes') for r in ROLES},
     'Search, category / price / rating filters, sort, infinite scroll',
     'catalog/views.py – AllowAny'),
    ('Site content (banner, hero, perks, footer)', {
        **{r: perms(View='Yes') for r in ROLES[:4]},
        'Super Admin': perms(View='Yes', Edit='Yes')},
     'Edit announcement, hero texts, perks and footer links',
     'sitecontent/views.py – AllowAny (read) · IsSuperAdmin (edit)'),
    ('Cart', {
        'Guest': perms(View='Browser', Create='Browser', Edit='Browser', Delete='Browser'),
        **{r: perms(View=SHOPPER, Create=SHOPPER, Edit=SHOPPER, Delete=SHOPPER) for r in ROLES[1:]}},
     'Save for later · guest cart merged on login · synced across tabs',
     'cart/views.py – quote: AllowAny · saved cart / merge: IsAuthenticated'),
    ('Wishlist', {
        'Guest': perms(),
        **{r: perms(View=SHOPPER, Create=SHOPPER, Delete=SHOPPER) for r in ROLES[1:]}},
     '—', 'catalog/views.py – IsAuthenticated'),
    ('Checkout & payment', {
        'Guest': perms(),
        **{r: perms(Create=SHOPPER) for r in ROLES[1:]}},
     'Apply coupon · pay (Razorpay / mock) · retry failed payment',
     'orders/views.py – IsAuthenticated · price recalculated on the server'),
    ('My orders', {
        'Guest': perms(),
        **{r: perms(View=SHOPPER) for r in ROLES[1:]}},
     'Cancel own order before it is shipped (stock returned)',
     'orders/views.py – IsAuthenticated + only request.user.orders'),
    ('My account – profile & password', {
        'Guest': perms(),
        **{r: perms(View=SHOPPER, Edit=SHOPPER) for r in ROLES[1:]}},
     'Change own name and password (email and role cannot be changed)',
     'accounts/views.py – IsAuthenticated'),
    ('Addresses', {
        'Guest': perms(),
        **{r: perms(View=SHOPPER, Create=SHOPPER, Edit=SHOPPER, Delete=SHOPPER) for r in ROLES[1:]}},
     'Set default address', 'orders/views.py – IsAuthenticated + only own addresses'),
    ('Admin dashboard', {
        **{r: perms() for r in ROLES[:3]},
        'Store Admin': perms(View='Own store'),
        'Super Admin': perms(View='All stores')},
     'KPIs, 7-day sales chart, low stock, recent orders',
     'dashboard/views.py – IsAdminRole + for_my_store()'),
    ('Sales reports', {
        **{r: perms() for r in ROLES[:3]},
        'Store Admin': perms(View='Own store'),
        'Super Admin': perms(View='All stores')},
     'Daily revenue, top products, revenue by category (7 / 30 / 90 days)',
     'backoffice/views.py – IsAdminRole'),
    ('Products, variants, stock & photos', {
        **{r: perms() for r in ROLES[:3]},
        'Store Admin': perms(View='Own store', Create='Own store', Edit='Own store', Delete='Own store'),
        'Super Admin': perms(View='All stores', Create='All stores', Edit='All stores', Delete='All stores')},
     'Upload photos (JPG / PNG / WEBP, max 3 MB) · show / hide product · super admin chooses or moves the store',
     'backoffice/views.py – IsAdminRole + for_my_store()'),
    ('Categories', {
        **{r: perms() for r in ROLES[:3]},
        'Store Admin': perms(View='Yes', Create='Yes'),
        'Super Admin': perms(View='Yes', Create='Yes', Edit='Yes', Delete='Only if empty')},
     'Categories are shared by all stores', 'backoffice/views.py – IsAdminRole (list / add) · IsSuperAdmin (rename / delete)'),
    ('Order management', {
        'Guest': perms(), 'Customer': perms(),
        'Staff': perms(View='Own store', Edit='Own store'),
        'Store Admin': perms(View='Own store', Edit='Own store'),
        'Super Admin': perms(View='All stores', Edit='All stores')},
     'Edit = move status forward (placed → packed → shipped → delivered) · Cancel before shipping: store admin / super admin only',
     'backoffice/views.py – IsStaffOrAdmin (list / next status) · IsAdminRole (cancel)'),
    ('User management', {
        **{r: perms() for r in ROLES[:3]},
        'Store Admin': perms(View='Customers + own staff', Create='Staff for own store', Edit='Remove own staff access'),
        'Super Admin': perms(View='Everyone', Edit='Admin ⇄ staff, remove access')},
     'Customer accounts can never be promoted · nobody can change their own role',
     'backoffice/views.py – IsAdminRole + checks in update_user_role / add_staff'),
    ('Coupons', {
        **{r: perms() for r in ROLES[:4]},
        'Super Admin': perms(View='Yes', Create='Yes', Edit='Yes', Delete='Yes')},
     'Shoppers can APPLY a coupon at checkout (one use per customer)',
     'backoffice/views.py – IsSuperAdmin'),
    ('Stores', {
        **{r: perms() for r in ROLES[:4]},
        'Super Admin': perms(View='Yes', Create='Yes', Edit='Yes')},
     'Activate / deactivate (no delete – orders must stay) · create store admin logins',
     'stores/views.py – IsSuperAdmin'),
    ('Django admin site (/admin)', {
        **{r: perms() for r in ROLES[:4]},
        'Super Admin': perms(View='Yes', Create='Yes', Edit='Yes', Delete='Yes')},
     'Raw database view for maintenance', 'seed_users – only the super admin has is_staff / is_superuser'),
]

ROLE_INFO = [
    ('Guest', 'Visitor who is not logged in.', 'Browses the shop, searches and filters products, keeps a cart in the browser.',
     'Anyone', 'Shop (/)', 'Public data only', '—'),
    ('Customer', 'Registered shopper. Every new sign-up is a customer.',
     'Shops, saves a wishlist, checks out and pays, tracks and cancels own orders, manages own profile and addresses.',
     'Register page', 'Shop (/)', 'Only their own cart, wishlist, orders, addresses', 'customer@shopkart.test'),
    ('Staff', 'Works for ONE store and processes its orders.',
     'Moves orders forward: placed → packed → shipped → delivered.',
     'Created as a NEW login by the store admin (customers are never promoted)', 'Staff orders (/staff/orders)',
     'Orders of their own store', 'staff@shopkart.test'),
    ('Store Admin', 'Runs ONE store.',
     "Manages the store's products, stock and photos; handles and cancels its orders; adds categories; "
     'creates and removes staff; sees the dashboard and reports of the store.',
     'Created by the super admin on the Stores page', 'Admin dashboard (/admin)', 'Their own store only',
     'admin@shopkart.test, urban@shopkart.test'),
    ('Super Admin', 'Owner of the whole marketplace.',
     'Creates and deactivates stores and their store admins; manages coupons, categories and site content; '
     'sees every store; can use the Django admin site.',
     'seed_users command (one account)', 'Admin dashboard (/admin)', 'All stores',
     'superadmin@shopkart.test'),
]

NOTES = [
    ('Legend', 'Yes = allowed · Own account = only their own records · Own store = only the store they work for · '
               'All stores = every store · empty / No Access = not allowed (the API returns 401 or 403).'),
    ('Full Access', 'View + Create + Edit + Delete.'),
    ('Approve', 'No approval workflow is implemented in ShopKart, so no role has an Approve permission.'),
    ('Export', 'No export / download feature is implemented yet, so no role has an Export permission. '
               'Reports and lists are view-only in the browser.'),
    ('Security', 'Every rule is checked by the Django REST API (permission classes + store filtering). '
                 'Hiding menus and routes in React is only for convenience.'),
    ('Shopping by staff / admins', 'Staff and admin accounts can also shop with their own account; '
                                   'after login they land in their console.'),
    ('Demo password', 'All demo accounts use the password Shop@1234 (development only).'),
    ('Source', f'Generated on {date.today():%d %b %Y} by docs/generate_access_matrix.py from the implemented code.'),
]

# ---------------------------------------------------------------------------------------------
# Excel styling
# ---------------------------------------------------------------------------------------------
INK, BRAND = '1A1C2B', '059669'
FILLS = {
    'full': PatternFill('solid', fgColor='D1FAE5'),  # full access – green
    'some': PatternFill('solid', fgColor='E0F2FE'),  # partial – blue
    'none': PatternFill('solid', fgColor='FEE2E2'),  # no access – red
    'head': PatternFill('solid', fgColor=INK),
    'area': PatternFill('solid', fgColor='F3F4F6'),
}
THIN = Side(style='thin', color='D1D5DB')
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical='center')
CENTER = Alignment(wrap_text=True, vertical='center', horizontal='center')


def tone(text):
    if not text or text.startswith('No Access'):
        return 'none'
    return 'full' if text.startswith('Full Access') else 'some'


def header(ws, row, values, widths=None):
    for col, value in enumerate(values, 1):
        cell = ws.cell(row=row, column=col, value=value)
        cell.font, cell.fill, cell.alignment, cell.border = Font(bold=True, color='FFFFFF'), FILLS['head'], CENTER, BORDER
    for col, width in enumerate(widths or [], 1):
        ws.column_dimensions[get_column_letter(col)].width = width
    ws.row_dimensions[row].height = 30


def title(ws, text, subtitle):
    ws['A1'] = text
    ws['A1'].font = Font(bold=True, size=16, color=INK)
    ws['A2'] = subtitle
    ws['A2'].font = Font(italic=True, size=10, color='6B7280')


def build_summary(wb):
    ws = wb.active
    ws.title = 'Access Matrix'
    title(ws, 'ShopKart – User Access Matrix', 'Module-wise access per role (summary). See "Detailed Permissions" for View / Create / Edit / Delete / Approve / Export.')
    header(ws, 4, ['Module', 'Area', *ROLES], [42, 11, 26, 30, 28, 32, 32])
    for r, (module, area, *cells) in enumerate(SUMMARY, 5):
        ws.cell(row=r, column=1, value=module).font = Font(bold=True)
        ws.cell(row=r, column=2, value=area)
        for c, text in enumerate(cells, 3):
            cell = ws.cell(row=r, column=c, value=text)
            cell.fill = FILLS[tone(text)]
        for c in range(1, len(ROLES) + 3):
            ws.cell(row=r, column=c).alignment, ws.cell(row=r, column=c).border = WRAP, BORDER
        ws.row_dimensions[r].height = 34
    ws.freeze_panes = 'C5'


def build_detailed(wb):
    ws = wb.create_sheet('Detailed Permissions')
    title(ws, 'Detailed permissions', 'Each module × permission type. Text = allowed (with scope). "✘" = not allowed.')
    header(ws, 4, ['Module', 'Permission', *ROLES, 'Other actions / notes', 'Enforced in (backend)'],
           [36, 12, 14, 16, 16, 20, 20, 48, 46])
    row = 5
    for module, by_role, other, enforced in DETAILED:
        first = row
        for permission in PERMISSIONS:
            ws.cell(row=row, column=2, value=permission).font = Font(bold=True)
            for c, role in enumerate(ROLES, 3):
                scope = by_role[role][permission]
                cell = ws.cell(row=row, column=c, value=('✔ ' + scope) if scope else '✘')
                cell.fill = FILLS['full' if scope else 'none']
                cell.font = Font(color='065F46' if scope else '9F1239')
                cell.alignment = CENTER
            for c in range(1, len(ROLES) + 5):
                ws.cell(row=row, column=c).border = BORDER
            row += 1
        ws.merge_cells(start_row=first, start_column=1, end_row=row - 1, end_column=1)
        ws.merge_cells(start_row=first, start_column=len(ROLES) + 3, end_row=row - 1, end_column=len(ROLES) + 3)
        ws.merge_cells(start_row=first, start_column=len(ROLES) + 4, end_row=row - 1, end_column=len(ROLES) + 4)
        for c, value in [(1, module), (len(ROLES) + 3, other), (len(ROLES) + 4, enforced)]:
            cell = ws.cell(row=first, column=c, value=value)
            cell.alignment = WRAP
            cell.font = Font(bold=(c == 1))
            if c == 1:
                cell.fill = FILLS['area']
    ws.freeze_panes = 'C5'


def build_roles(wb):
    ws = wb.create_sheet('Roles')
    title(ws, 'User roles and responsibilities', 'Who each role is, what they do and which data they can reach.')
    header(ws, 4, ['Role', 'Who', 'Responsibilities', 'How the account is created', 'Lands on after login', 'Data scope', 'Demo account'],
           [14, 34, 60, 36, 26, 30, 30])
    for r, values in enumerate(ROLE_INFO, 5):
        for c, value in enumerate(values, 1):
            cell = ws.cell(row=r, column=c, value=value)
            cell.alignment, cell.border = WRAP, BORDER
            cell.font = Font(bold=(c == 1))
        ws.row_dimensions[r].height = 62


def build_notes(wb):
    ws = wb.create_sheet('Notes & Legend')
    title(ws, 'Notes and legend', '')
    header(ws, 4, ['Topic', 'Explanation'], [26, 110])
    for r, (topic, text) in enumerate(NOTES, 5):
        ws.cell(row=r, column=1, value=topic).font = Font(bold=True)
        ws.cell(row=r, column=2, value=text)
        for c in (1, 2):
            ws.cell(row=r, column=c).alignment, ws.cell(row=r, column=c).border = WRAP, BORDER
        ws.row_dimensions[r].height = 32


def build_html():
    """A styled HTML copy of the summary sheet – screenshot it to docs/user-access-matrix.png."""
    colours = {'full': ('#d1fae5', '#065f46'), 'some': ('#e0f2fe', '#075985'), 'none': ('#fee2e2', '#9f1239')}
    rows = []
    for module, area, *cells in SUMMARY:
        tds = ''.join(f'<td style="background:{colours[tone(t)][0]};color:{colours[tone(t)][1]}">{escape(t)}</td>' for t in cells)
        rows.append(f'<tr><th>{escape(module)}<span>{area}</span></th>{tds}</tr>')
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>ShopKart – User Access Matrix</title>
<style>
body{{margin:0;padding:28px;background:#f6f8f7;font-family:'Segoe UI',system-ui,sans-serif;color:#1a1c2b}}
h1{{margin:0;font-size:24px}} p{{margin:4px 0 18px;color:#5d6075;font-size:13px}}
table{{border-collapse:separate;border-spacing:0;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:12.5px}}
thead th{{background:#1a1c2b;color:#fff;padding:10px;text-align:left;font-size:12px;letter-spacing:.03em}}
tbody th{{text-align:left;padding:9px 10px;font-weight:600;width:250px;border-bottom:1px solid #e5e7eb}}
tbody th span{{display:block;font-weight:400;color:#7c7f94;font-size:11px}}
td{{padding:9px 10px;border-bottom:1px solid #fff;border-left:2px solid #fff;font-weight:500}}
.legend{{margin-top:14px;font-size:12px;color:#5d6075}} .legend b{{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin:0 4px 0 14px}}
</style></head><body>
<h1>ShopKart – User Access Matrix</h1>
<p>Module-wise access per role, taken from the implemented API permissions. Full details: docs/User_Access_Matrix.xlsx</p>
<table><thead><tr><th>Module</th>{''.join(f'<th>{r}</th>' for r in ROLES)}</tr></thead><tbody>{''.join(rows)}</tbody></table>
<div class="legend"><b style="background:#d1fae5"></b>Full access <b style="background:#e0f2fe"></b>Partial / scoped access <b style="background:#fee2e2"></b>No access
&nbsp;·&nbsp; Approve and Export are not implemented for any role.</div>
</body></html>"""


if __name__ == '__main__':
    workbook = Workbook()
    build_summary(workbook)
    build_detailed(workbook)
    build_roles(workbook)
    build_notes(workbook)
    workbook.save(DOCS / 'User_Access_Matrix.xlsx')
    (DOCS / 'user-access-matrix.html').write_text(build_html(), encoding='utf-8')
    print('Wrote docs/User_Access_Matrix.xlsx and docs/user-access-matrix.html')
