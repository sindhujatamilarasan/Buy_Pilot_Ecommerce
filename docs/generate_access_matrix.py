"""Generate docs/User_Access_Matrix.xlsx (and an HTML copy used for the PNG screenshot).

The permissions below were taken from the IMPLEMENTED code:
  backend  → permission classes in accounts/permissions.py and each view (IsSuperAdmin, IsAdminRole,
             IsStaffOrAdmin, IsAuthenticated, AllowAny) + for_my_store() store filtering
             + for_my_warehouse() for a warehouse manager tied to one location
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
ROLES = ['Guest', 'Customer', 'Staff', 'Warehouse Manager', 'Store Admin', 'Super Admin']
PERMISSIONS = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Export']
KEY = dict(zip(['guest', 'customer', 'staff', 'warehouse', 'store_admin', 'super_admin'], ROLES))
LOGGED_IN = ROLES[1:]

# ---------------------------------------------------------------------------------------------
# 1. Summary matrix (like the example): one short text per module and role
# ---------------------------------------------------------------------------------------------
NO = 'No Access'
LOGIN = 'No Access (login required)'
SAME = 'Same as customer (own account)'  # staff / warehouse / admins can also shop with their own account


def row(module, area, default=NO, **cells):
    """row('Stores', 'Admin', super_admin='Full Access') → (module, area, text per role in ROLES order)."""
    texts = {KEY[k]: v for k, v in cells.items()}
    return (module, area, *[texts.get(r, default) for r in ROLES])


SHOPPER = dict(staff=SAME, warehouse=SAME, store_admin=SAME, super_admin=SAME)
INVENTORY_TEAM_VIEW = dict(warehouse='View (own warehouse)', store_admin='View (own store)', super_admin='View (all stores)')

SUMMARY = [
    row('Shop – products & categories', 'Shop', 'View'),
    row('Site content (banner, hero, perks, footer)', 'Shop', 'View', super_admin='View / Edit'),
    row('Cart', 'Shop', guest='View / Create / Edit / Delete (in browser)',
        customer='View / Create / Edit / Delete (saved to account)', **SHOPPER),
    row('Wishlist', 'Shop', guest=LOGIN, customer='View / Create / Delete (own)', **SHOPPER),
    row('Checkout & payment', 'Shop', guest=LOGIN, customer='Create order · Apply coupon · Pay / Retry', **SHOPPER),
    row('My orders', 'Account', guest=LOGIN, customer='View · Cancel before shipping (own)', **SHOPPER),
    row('My account – profile, password, addresses', 'Account', guest=LOGIN,
        customer='View / Edit (own) · Addresses: Create / Edit / Delete', **SHOPPER),
    row('Admin dashboard', 'Admin', store_admin='View (own store)', super_admin='View (all stores)'),
    row('Sales reports', 'Admin', store_admin='View (own store)', super_admin='View (all stores)'),
    row('Products, variants & photos', 'Admin', warehouse='Create draft product (while receiving goods)',
        store_admin='Full Access (own store)', super_admin='Full Access (all stores)'),
    row('Categories', 'Admin', store_admin='View / Create', super_admin='Full Access'),
    row('Order management', 'Admin', staff='View · Update status (own store)',
        store_admin='View · Update status · Cancel (own store)', super_admin='View · Update status · Cancel (all stores)'),
    row('Orders to pick', 'Fulfilment', warehouse='View (own warehouse)', store_admin='View (own store)',
        super_admin='View (all stores)'),
    row('Pick lists', 'Fulfilment', staff='View / Print (own store)', warehouse='View / Print (own warehouse)',
        store_admin='View / Print (own store)', super_admin='View / Print (all stores)'),
    row('Inventory overview & reorder alerts', 'Inventory', **INVENTORY_TEAM_VIEW),
    row('Warehouses', 'Inventory', warehouse='View (own warehouse; all as transfer target)', store_admin='Full Access (own store, no delete)',
        super_admin='Full Access (all stores, no delete)'),
    row('Stock levels', 'Inventory', warehouse='View · Edit reorder level / bin · Export (own warehouse)',
        store_admin='View · Edit reorder level / bin · Export', super_admin='View · Edit reorder level / bin · Export (all stores)'),
    row('Goods receipts', 'Inventory', warehouse='View / Create (own warehouse)', store_admin='View / Create (own store)',
        super_admin='View / Create (all stores)'),
    row('Stock adjustments', 'Inventory', warehouse='View / Create in own warehouse (needs approval)',
        store_admin='View / Create · Approve / Reject (own store)', super_admin='View / Create · Approve / Reject (all stores)'),
    row('Stock transfers', 'Inventory', warehouse='Send from own warehouse (needs approval) · Dispatch / Cancel outgoing · Receive incoming',
        store_admin='Full flow · Approve / Reject (own store)', super_admin='Full flow · Approve / Reject (all stores)'),
    row('Stock history', 'Inventory', warehouse='View · Export (own warehouse)', store_admin='View · Export (own store)',
        super_admin='View · Export (all stores)'),
    row('User management', 'Admin', store_admin='View · Create staff / warehouse managers · Move a manager to another warehouse · Remove access (own store)',
        super_admin='View · Change admin / staff / warehouse role · Remove access'),
    row('Coupons', 'Admin', guest=LOGIN, customer='Apply at checkout only', super_admin='Full Access'),
    row('Stores', 'Admin', super_admin='View / Create / Edit · Add store admins'),
    row('Site content editor', 'Admin', super_admin='View / Edit'),
    row('Django admin site (/admin)', 'System', super_admin='Full Access'),
]

# ---------------------------------------------------------------------------------------------
# 2. Detailed matrix: every module × permission type. Cell = scope text, or '' = not allowed.
#    "Own account" = only their own records · "Own store" = only their store · "All stores" = everything
# ---------------------------------------------------------------------------------------------
def perms(**granted):
    """perms(View='Own', Create='Own') → {'View': 'Own', 'Create': 'Own', 'Edit': '', …}"""
    return {p: granted.get(p, '') for p in PERMISSIONS}


def roles(default=None, **by_role):
    """roles(store_admin=perms(View='Own store')) → every role, not allowed unless given."""
    result = {r: default or perms() for r in ROLES}
    result.update({KEY[k]: v for k, v in by_role.items()})
    return result


OWN = 'Own account'
OWN_STORE, ALL = 'Own store', 'All stores'
OWN_WH = 'Own warehouse'  # a manager tied to one location; an untied manager = own store
def shoppers(**granted):
    return {k: perms(**granted) for k in ['customer', 'staff', 'warehouse', 'store_admin', 'super_admin']}


def team(warehouse=None, store_admin=None, super_admin=None):
    return dict(warehouse=warehouse or perms(), store_admin=store_admin or perms(), super_admin=super_admin or perms())


DETAILED = [
    # module, {role: perms}, other actions, where it is enforced
    ('Shop – products & categories', roles(perms(View='Yes')),
     'Search, category / price / rating filters, sort, infinite scroll', 'catalog/views.py – AllowAny'),
    ('Site content (banner, hero, perks, footer)', roles(perms(View='Yes'), super_admin=perms(View='Yes', Edit='Yes')),
     'Edit announcement, hero texts, perks and footer links', 'sitecontent/views.py – AllowAny (read) · IsSuperAdmin (edit)'),
    ('Cart', roles(guest=perms(View='Browser', Create='Browser', Edit='Browser', Delete='Browser'),
                   **shoppers(View=OWN, Create=OWN, Edit=OWN, Delete=OWN)),
     'Save for later · guest cart merged on login · synced across tabs',
     'cart/views.py – quote: AllowAny · saved cart / merge: IsAuthenticated'),
    ('Wishlist', roles(**shoppers(View=OWN, Create=OWN, Delete=OWN)), '—', 'catalog/views.py – IsAuthenticated'),
    ('Checkout & payment', roles(**shoppers(Create=OWN)), 'Apply coupon · pay (Razorpay / mock) · retry failed payment',
     'orders/views.py – IsAuthenticated · price recalculated on the server'),
    ('My orders', roles(**shoppers(View=OWN)), 'Cancel own order before it is shipped (stock returned to its warehouse)',
     'orders/views.py – IsAuthenticated + only request.user.orders'),
    ('My account – profile & password', roles(**shoppers(View=OWN, Edit=OWN)),
     'Change own name and password (email and role cannot be changed)', 'accounts/views.py – IsAuthenticated'),
    ('Addresses', roles(**shoppers(View=OWN, Create=OWN, Edit=OWN, Delete=OWN)), 'Set default address',
     'orders/views.py – IsAuthenticated + only own addresses'),
    ('Admin dashboard', roles(store_admin=perms(View=OWN_STORE), super_admin=perms(View=ALL)),
     'KPIs, 7-day sales chart, low stock, recent orders', 'dashboard/views.py – IsAdminRole + for_my_store()'),
    ('Sales reports', roles(store_admin=perms(View=OWN_STORE), super_admin=perms(View=ALL)),
     'Daily revenue, top products, revenue by category (7 / 30 / 90 days)', 'backoffice/views.py – IsAdminRole'),
    ('Products, variants & photos', roles(
        warehouse=perms(Create='Draft only'),
        store_admin=perms(View=OWN_STORE, Create=OWN_STORE, Edit=OWN_STORE, Delete=OWN_STORE),
        super_admin=perms(View=ALL, Create=ALL, Edit=ALL, Delete=ALL)),
     'Photos (JPG / PNG / WEBP, max 3 MB) · show / hide · a new variant gets OPENING stock; after that stock changes only in Inventory · '
     'a warehouse manager can add a product that is not in the system yet while receiving goods – it stays HIDDEN (draft) until the store admin adds photos and shows it',
     'backoffice/views.py – IsAdminRole + for_my_store() · inventory/views.py new_product – IsWarehouseTeam'),
    ('Categories', roles(store_admin=perms(View='Yes', Create='Yes'),
                         super_admin=perms(View='Yes', Create='Yes', Edit='Yes', Delete='Only if empty')),
     'Categories are shared by all stores', 'backoffice/views.py – IsAdminRole (list / add) · IsSuperAdmin (rename / delete)'),
    ('Order management', roles(staff=perms(View=OWN_STORE, Edit=OWN_STORE), store_admin=perms(View=OWN_STORE, Edit=OWN_STORE),
                               super_admin=perms(View=ALL, Edit=ALL)),
     'Edit = move status forward (placed → packed → shipped → delivered) · Cancel before shipping: store admin / super admin only',
     'backoffice/views.py – IsStaffOrAdmin (list / next status) · IsAdminRole (cancel)'),
    ('Orders to pick', roles(**team(perms(View=OWN_WH), perms(View=OWN_STORE), perms(View=ALL))),
     'Paid orders (placed / packed) that take stock from my warehouse, oldest first',
     'inventory/views.py orders_to_pick – IsWarehouseTeam + for_my_warehouse()'),
    ('Pick lists', roles(staff=perms(View=OWN_STORE), **team(perms(View=OWN_WH), perms(View=OWN_STORE), perms(View=ALL))),
     'Which warehouse and bin to pick each item from · printable · a tied manager sees only the lines of their warehouse',
     'inventory/views.py – IsFulfilmentTeam + for_my_store()'),
    ('Inventory overview & reorder alerts', roles(**team(perms(View=OWN_WH), perms(View=OWN_STORE), perms(View=ALL))),
     'Units, low / out of stock, approvals waiting, transfers to dispatch / receive', 'inventory/views.py – IsWarehouseTeam'),
    ('Warehouses', roles(**team(perms(View=OWN_WH), perms(View=OWN_STORE, Create=OWN_STORE, Edit=OWN_STORE),
                                 perms(View=ALL, Create=ALL, Edit=ALL))),
     'Set the default warehouse (sales take stock from it first) · deactivate only when empty (no delete)',
     'inventory/views.py – IsWarehouseTeam (view) · admin roles (create / edit)'),
    ('Stock levels', roles(**team(perms(View=OWN_WH, Edit=OWN_WH, Export=OWN_WH),
                                   perms(View=OWN_STORE, Edit=OWN_STORE, Export=OWN_STORE), perms(View=ALL, Edit=ALL, Export=ALL))),
     'Edit = reorder level and bin / shelf only (quantity changes through receipts, adjustments, transfers, sales) · CSV export',
     'inventory/views.py – IsWarehouseTeam'),
    ('Goods receipts', roles(**team(perms(View=OWN_WH, Create=OWN_WH), perms(View=OWN_STORE, Create=OWN_STORE),
                                     perms(View=ALL, Create=ALL))),
     'Stock arriving from a supplier → stock goes up, logged as GR-xxxxx', 'inventory/operations.py – IsWarehouseTeam'),
    ('Stock adjustments', roles(**team(perms(View=OWN_WH, Create=OWN_WH),
                                        perms(View=OWN_STORE, Create=OWN_STORE, Approve=OWN_STORE),
                                        perms(View=ALL, Create=ALL, Approve=ALL))),
     "Damaged / lost / found / count correction · a warehouse manager's request waits for approval; an admin's own is applied at once",
     'inventory/operations.py – IsWarehouseTeam (create) · IsAdminRole (approve / reject)'),
    ('Stock transfers', roles(**team(perms(View=OWN_WH, Create=OWN_WH, Edit=OWN_WH),
                                      perms(View=OWN_STORE, Create=OWN_STORE, Edit=OWN_STORE, Approve=OWN_STORE),
                                      perms(View=ALL, Create=ALL, Edit=ALL, Approve=ALL))),
     'requested → approved → in transit → received · Edit = dispatch / receive / cancel · stock in transit is not sellable · '
     'a tied manager sends only FROM their warehouse (to any warehouse of the store); dispatch / cancel = sending side, receive = receiving side',
     'inventory/operations.py – IsWarehouseTeam (create / dispatch / receive / cancel) · IsAdminRole (approve / reject)'),
    ('Stock history', roles(**team(perms(View=OWN_WH, Export=OWN_WH), perms(View=OWN_STORE, Export=OWN_STORE),
                                    perms(View=ALL, Export=ALL))),
     'Every stock change: who, when, why, balance after · CSV export', 'inventory/views.py – IsWarehouseTeam'),
    ('User management', roles(store_admin=perms(View='Customers + own team', Create='Staff / warehouse managers',
                                                 Edit='Move manager to a warehouse · remove own team access'),
                              super_admin=perms(View='Everyone', Edit='Admin / staff / warehouse role, remove access')),
     'Customer accounts can never be promoted · nobody can change their own role',
     'backoffice/views.py – IsAdminRole + checks in update_user_role / add_staff / set_manager_warehouse'),
    ('Coupons', roles(super_admin=perms(View='Yes', Create='Yes', Edit='Yes', Delete='Yes')),
     'Shoppers can APPLY a coupon at checkout (one use per customer)', 'backoffice/views.py – IsSuperAdmin'),
    ('Stores', roles(super_admin=perms(View='Yes', Create='Yes', Edit='Yes')),
     'Activate / deactivate (no delete – orders must stay) · create store admin logins', 'stores/views.py – IsSuperAdmin'),
    ('Django admin site (/admin)', roles(super_admin=perms(View='Yes', Create='Yes', Edit='Yes', Delete='Yes')),
     'Raw database view for maintenance', 'seed_users – only the super admin has is_staff / is_superuser'),
]

ROLE_INFO = [
    ('Guest', 'Visitor who is not logged in.', 'Browses the shop, searches and filters products, keeps a cart in the browser.',
     'Anyone', 'Shop (/)', 'Public data only', '—'),
    ('Customer', 'Registered shopper. Every new sign-up is a customer.',
     'Shops, saves a wishlist, checks out and pays, tracks and cancels own orders, manages own profile and addresses.',
     'Register page', 'Shop (/)', 'Only their own cart, wishlist, orders, addresses', 'customer@shopkart.test'),
    ('Staff', 'Works for ONE store and processes its orders.',
     'Moves orders forward (placed → packed → shipped → delivered) and prints pick lists.',
     'Created as a NEW login by the store admin (customers are never promoted)', 'Staff orders (/staff/orders)',
     'Orders of their own store', 'staff@shopkart.test'),
    ('Warehouse Manager', 'Looks after ONE warehouse (location, e.g. Chennai) of a store – or all warehouses of the store if not tied to one.',
     'Picks and packs orders taken from their warehouse, receives goods (and adds a new product as a draft), requests stock '
     'adjustments and transfers (approved by the store admin), dispatches outgoing and receives incoming transfers, '
     'sets reorder levels and bins, prints pick lists, exports stock reports.',
     'Created as a NEW login by the store admin, who picks the warehouse (and can move the manager later)',
     'Inventory (/inventory)', 'Stock of their own warehouse (or the whole store if not tied)',
     'warehouse@shopkart.test'),
    ('Store Admin', 'Runs ONE store.',
     "Manages the store's products and photos, warehouses and stock (and APPROVES adjustments and transfers); handles and "
     'cancels its orders; adds categories; creates and removes staff and warehouse managers and moves managers between warehouses; sees the dashboard and reports.',
     'Created by the super admin on the Stores page', 'Admin dashboard (/admin)', 'Their own store only',
     'admin@shopkart.test, urban@shopkart.test'),
    ('Super Admin', 'Owner of the whole marketplace.',
     'Creates and deactivates stores and their store admins; manages coupons, categories and site content; '
     'sees and manages every store, including inventory; can use the Django admin site.',
     'seed_users command (one account)', 'Admin dashboard (/admin)', 'All stores',
     'superadmin@shopkart.test'),
]

NOTES = [
    ('Legend', 'Yes = allowed · Own account = only their own records · Own store = only the store they work for · '
               'All stores = every store · ✘ / No Access = not allowed (the API returns 401 or 403).'),
    ('Full Access', 'View + Create + Edit + Delete.'),
    ('Approve', 'Stock adjustments and stock transfers requested by a warehouse manager must be approved (or rejected) '
                'by the store admin or the super admin. A warehouse manager can never approve their own request.'),
    ('Export', 'Stock levels and stock history can be exported as CSV by warehouse managers, store admins and the super admin. '
               'Sales reports and other lists are view-only in the browser.'),
    ('Own warehouse', 'A warehouse manager tied to one warehouse sees and works only in that warehouse. A transfer may be sent '
                      'to any warehouse of the store. A manager not tied to a warehouse works on the whole store.'),
    ('Order allocation', "A paid order takes stock from the warehouse in the customer's city first, then the default warehouse, "
                         'then splits across others. A cancelled order returns stock to the same warehouse.'),
    ('Stock rule', 'Stock quantities change only through Inventory (goods receipts, approved adjustments, transfers) and '
                   'through sales / cancellations – every change is written to the stock history.'),
    ('Security', 'Every rule is checked by the Django REST API (permission classes + store filtering). '
                 'Hiding menus and routes in React is only for convenience.'),
    ('Shopping by team members', 'Staff, warehouse managers and admins can also shop with their own account; '
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
    title(ws, 'Buy Pilot – User Access Matrix', 'Module-wise access per role (summary). See "Detailed Permissions" for View / Create / Edit / Delete / Approve / Export.')
    header(ws, 4, ['Module', 'Area', *ROLES], [40, 11, 24, 28, 26, 30, 32, 32])
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
           [34, 12, 13, 15, 15, 17, 17, 17, 48, 46])
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
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Buy Pilot – User Access Matrix</title>
<style>
body{{margin:0;padding:28px;background:#f6f8f7;font-family:'Segoe UI',system-ui,sans-serif;color:#1a1c2b}}
h1{{margin:0;font-size:24px}} p{{margin:4px 0 18px;color:#5d6075;font-size:13px}}
table{{border-collapse:separate;border-spacing:0;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:12.5px}}
thead th{{background:#1a1c2b;color:#fff;padding:10px;text-align:left;font-size:12px;letter-spacing:.03em}}
tbody th{{text-align:left;padding:9px 10px;font-weight:600;width:230px;border-bottom:1px solid #e5e7eb}}
tbody th span{{display:block;font-weight:400;color:#7c7f94;font-size:11px}}
td{{padding:9px 10px;border-bottom:1px solid #fff;border-left:2px solid #fff;font-weight:500}}
.legend{{margin-top:14px;font-size:12px;color:#5d6075}} .legend b{{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin:0 4px 0 14px}}
</style></head><body>
<h1>Buy Pilot – User Access Matrix</h1>
<p>Module-wise access per role, taken from the implemented API permissions. Full details incl. Approve / Export: docs/User_Access_Matrix.xlsx</p>
<table><thead><tr><th>Module</th>{''.join(f'<th>{r}</th>' for r in ROLES)}</tr></thead><tbody>{''.join(rows)}</tbody></table>
<div class="legend"><b style="background:#d1fae5"></b>Full access <b style="background:#e0f2fe"></b>Partial / scoped access <b style="background:#fee2e2"></b>No access
&nbsp;·&nbsp; Approve: adjustments and transfers (admins) · Export: stock levels and history (CSV).</div>
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
