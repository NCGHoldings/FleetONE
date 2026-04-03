

# Create Comprehensive Yutong Sales Complete Flow Diagram

## What to build
A detailed Mermaid diagram covering the full Yutong bus sales lifecycle — matching the style and depth of the Special Hire flow diagram. It will cover operations, finance (all 5 JE types with GL account codes), documents, AR integration, database tables, and settlement verification.

## Diagram sections

### Operations Flow
Quotation → Order (Cash 10/40/50 or Lease 20/80 schedule) → Supplier → Shipment → Customs → Processing → RMV → Delivery → Payment recording → Invoice generation → Invoice approval

### Finance Flow (5 Journal Entry types)
- JE-1: Advance/Interim Payment — DR Bank / CR Customer Advance (22303001)
- JE-2: Revenue Recognition on Approval — DR Trade Receivable (12201001) / CR Sales Revenue (41101001) + CR VAT Output (22302001)
- JE-3: Advance Application (auto) — DR Customer Advance (22303001) / CR Trade Receivable (12201001)
- JE-4: Balance Payment — DR Bank / CR Trade Receivable (12201001)
- JE-5: Full Payment (no invoice) — DR Bank / CR Sales Revenue (41101001)
- Proforma Invoice explicitly excluded from AR/GL

### Documents, AR Integration, Database Tables, Settlement
All included with cross-links showing triggers

## File
- **Create**: `/mnt/documents/Yutong_Complete_Sales_Flow.mmd`

No code changes needed — documentation artifact only.

