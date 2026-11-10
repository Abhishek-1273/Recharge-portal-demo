# Recharge Partner Portal Demo

A modern, multi-tier B2B recharge and bill payment distribution platform with a double-entry immutable financial ledger powered by Supabase Cloud PostgreSQL.

### Architecture Highlights
- **Atomic 3-Tier Commission Split:** 1.50% Retailer, 1.00% Distributor, 0.50% Super Master + 0.25% Dedicated App Platform Fee.
- **Double-Entry Financial Ledger:** All balances and holds stored strictly in integer `paise` (zero float arithmetic rounding bugs).
- **Concurrency & Idempotency Proof:** Mutex-locked financial queue tested against 50 simultaneous transactions with zero race conditions.
- **Cashfree Sandbox Engine:** Dynamic order creation and instant prepaid wallet top-up simulation.
- **Supabase Cloud PostgreSQL:** Fully ACID-compliant cloud database.
