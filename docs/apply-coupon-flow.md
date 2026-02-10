# Add “Apply Discount Coupon” Flow to Customer Orders

## Goal
Enable customers to apply valid discount coupons to an order before checkout. Show the discounted total, handle invalid or expired coupons, and persist redemptions. Build a responsive “Apply Coupon” view or sheet that can be opened from the cart or checkout screen.

## Repo / Stack
- **Frontend:** React (customer app, same design language as the admin panel)
- **Backend:** Supabase (Postgres) with existing tables `orders`, `order_items`, `coupons`, `coupon_redemptions`, and `profiles`
- **API Access:** Supabase client already configured; reuse auth/session pattern from existing customer flows.

## Existing Schema Highlights
```sql
coupons (
  id UUID pk,
  code text unique not null,
  name text not null,
  description text,
  discount_type text check('percent' or 'flat'),
  discount_value numeric,
  max_redemptions int,
  per_user_limit int,
  min_order_value numeric,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz
)

coupon_redemptions (
  id UUID pk,
  coupon_id UUID references coupons,
  user_id UUID references profiles,
  order_id UUID references orders,
  redeemed_at timestamptz default now()
)

orders (
  id UUID pk,
  user_id UUID references profiles,
  subtotal numeric,
  discount numeric default 0,
  total numeric,
  status text,
  created_at timestamptz
)

order_items (...)
profiles (...)
```

## Scope & Requirements

### UI / UX
- Add an **Apply Coupon** entry point on the order summary (for example, a button below the subtotal).
- Open a bottom sheet or modal with:
  - Text input for coupon code.
  - “Apply” button.
  - Space for success or error feedback.
  - Summary box showing subtotal, discount, and new total.
- If a coupon is active on the order, show it inline with a “Remove” link.
- Ensure responsive design: mobile-first layout, desktop modal width ≤ 480px.

### Feature Flow
1. Customer enters coupon code → validate → show discount → update totals.
2. Persist the applied coupon and discount on the draft order record.
3. Allow removing the coupon before checkout (clear discount and update totals).
4. When checkout completes, create a record in `coupon_redemptions`.

### Validation Rules
- Coupon must exist, be active, and fall within `starts_at`/`expires_at` range.
- Enforce `max_redemptions` (global) and `per_user_limit` (per user) via counts in `coupon_redemptions`.
- `min_order_value` must be ≤ order subtotal.
- Prevent applying the same coupon twice or stacking multiple coupons.
- For percent discounts, cap the total discount at 100% of subtotal.
- Round monetary values to two decimals.

### Data / State Management
- Reuse order state (context/store) already used in cart/checkout.
- Store coupon metadata and discount in order state so the UI stays in sync.
- On apply:
  - Call Supabase RPC or use row-level logic to fetch the coupon, validate constraints, and update `orders`.
  - Recompute totals client-side as fallback if RPC unavailable.
- On remove:
  - Clear coupon fields and write `discount = 0`, `total = subtotal`.
- On checkout success:
  - Insert a row into `coupon_redemptions` with `coupon_id`, `order_id`, and `user_id`.

### API Layer
- Add helper (e.g., `applyCoupon(code: string, orderId: string, userId: string)`):
  - SELECT coupon by code.
  - Run all validation checks.
  - Calculate discount (flat vs percent).
  - UPDATE `orders` with `discount`, `total = subtotal - discount`, and `coupon_id`.
  - Return the updated order summary.
- Add `removeCoupon(orderId)` helper to reset fields.
- Guard helpers against concurrent updates (consider Supabase row-level security or transactions).

### Error Handling & Messaging
- Friendly errors for invalid code, expired, usage limits, or below minimum order value.
- Display the first failing validation reason.
- Ensure retry-safe logic; clear loading state on failure.

### Testing / Acceptance Checklist
- [ ] Apply valid flat and percent coupons.
- [ ] Reject inactive or expired codes.
- [ ] Enforce per-user and global redemption limits.
- [ ] Removing coupon restores totals.
- [ ] Checkout logs redemption entry.
- [ ] UI matches design system (buttons, typography, spacing).

### Deliverables
- New React components/hooks integrating into the checkout/cart view.
- Supabase service helpers (`couponService.ts` or similar).
- Optional SQL/RLS updates if needed for new RPC endpoints.
- Unit or integration tests for validation helpers.

### Design Notes
- Follow admin panel styling conventions (Ant Design equivalents or customer-app system).
- Keep copy tone simple: e.g., “Coupon applied! You saved $X.”



