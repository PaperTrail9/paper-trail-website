# MEMORY.md - Long-Term Memory

## User Preferences
- **Chat History:** Retain and review past conversations for 30 days before asking user to repeat information
- **Context Awareness:** Check memory and recent chat history before requesting clarification on previously discussed topics

## Key Facts
- Alexander is a 33yo mechatronics engineer at Tesla
- Family: wife Alexandra (28), daughters Nora (5) and Maeve (2)
- Location: Sunfield, Buda, Austin, Texas
- Email: alex@1v1a.com (iCloud) | Phone: 808-381-8835
- Side business: **Vectarr LLC** — machine shop quoting portal at vectarr.com
  - Partner: Kamal (handling site dev)
  - Site being updated weekend of Jan 31, 2026
- Groceries: H-E-B Buda + Costco Kyle, ~$200/week, healthy focus
- Email: MarvinMartian9@icloud.com (all automation)

## Active Projects
1. **Vectarr** — outreach and onboarding machine shops
2. **Tax Prep 2025** — collect forms, find deductions, optimize take-home
3. **Household Systems** — groceries, supplies, meal planning
4. **Financial Health** — portfolio review and suggestions
5. **Dinner Automation** — HEB cart + Apple Calendar integration (see below)

---

## Dinner Automation System

Complete automated meal planning with email confirmation, calendar sync, and grocery cart integration.

### Overview
- **Recipe Database:** `dinner-automation/data/recipe-database.json`
- **Weekly Plan:** Generated every Saturday at 9:00 AM
- **Email Confirmation:** Sent to alex@1v1a.com with meal plan for approval
- **Apple Calendar:** Full recipe details + YouTube cooking videos synced
- **HEB Cart:** Auto-populated via browser extension with all ingredients
- **Reply Processing:** Changes from email replies automatically applied

### System Flow

```
Saturday 9:00 AM
    ↓
Generate Weekly Meal Plan
    ↓
Send HTML Email (with Unsplash images, tracking pixel)
    ↓
Status: SENT ─────────┐
    ↓                  │
Check for Open ────────┤
    ↓                  │
Status: OPENED         │
    ↓                  │
Check for Reply        │
    ↓                  │
Status: REPLIED ←──────┘
    ↓
Parse with NLP (smart patterns)
    ↓
Apply Changes
    ↓
Status: CONFIRMED
    ↓
├─→ Sync to Apple Calendar
├─→ Update HEB Cart
└─→ Send Confirmation Email

Fallback Path (after 6 hours):
    SENT/OPENED ──→ Send SMS via Twilio
                        ↓
                   SMS Reply Detected
                        ↓
                   Parse & Apply Same as Email
```

### Key Components

| Component | Purpose | File |
|-----------|---------|------|
| **Email System v2** | Templates, NLP parsing, tracking, SMS fallback | `dinner-email-system-v2.js` |
| **Calendar Sync** | Sync meals with full recipes + YouTube links | `sync-dinner-to-icloud.js` |
| **YouTube Cache** | Store cooking video links for each recipe | `build-youtube-cache.js` |
| **HEB Cart Automation** | Playwright + CDP with per-item verification | `heb-add-cart.js` |
| **Recipe Database** | All family recipes with stories, tips, pairings | `recipe-database.json` |

### Critical Fix (Feb 15, 2026) — HEB Product Naming

**Problem:** Generic search terms (`basmati rice`, `naan bread`) consistently timeout/fail.
**Solution:** Use HEB-branded product names (`H-E-B Basmati Rice`, `Stonefire Naan`).

**Implementation:**
- Updated `weekly-plan.json` with correct `hebSearch` terms
- Created `docs/HEB-PRODUCT-NAMING.md` for future reference
- All future meal plans MUST use branded product names

### Recent Updates (Feb 11, 2026)

1. **🛒 HEB Cart Automation v4.0** — Playwright + CDP with per-item verification (42/42 items ✅)
2. **📧 Email Confirmation System v2.0** — Complete rewrite with templates, NLP, tracking, SMS fallback
3. **🎥 YouTube Integration** — Cooking tutorial videos linked in calendar events
4. **🔄 Bidirectional Sync** — Email replies automatically update all systems
5. **📱 Full Integration** — Email → Calendar → HEB cart all connected

### Email System v2.0 (New)

**File:** `dinner-automation/scripts/dinner-email-system-v2.js`

Complete overhaul of the dinner confirmation email system with enterprise-grade features:

#### Features

| Feature | Description |
|---------|-------------|
| **HTML Templates** | Modern, responsive email templates with gradient headers, meal cards, and status tracking |
| **NLP Reply Parser** | Smart parsing using regex patterns + semantic matching (not just keywords) |
| **Status Tracking** | Full lifecycle: `sent → opened → replied → confirmed` with timeline history |
| **SMS Fallback** | Twilio integration sends text after 6 hours of no email reply |
| **Meal Images** | Unsplash API integration for beautiful meal thumbnails with caching |

#### Command Reference

```bash
# Send dinner plan email
node dinner-email-system-v2.js --send-test

# Check for replies (auto-applies changes)
node dinner-email-system-v2.js --check-reply

# View tracking status
node dinner-email-system-v2.js --status

# Send SMS fallback manually
node dinner-email-system-v2.js --send-sms

# Test NLP parser
node dinner-email-system-v2.js --test-parser "Swap Monday to Chicken Alfredo"

# Simulate a reply (for testing)
node dinner-email-system-v2.js --simulate "Looks good!"
```

#### NLP Parser Examples

The smart parser understands natural language variations:

| User Says | Parsed Action |
|-----------|---------------|
| "Looks good!" / "Perfect" / "Confirmed" | `confirm` |
| "Swap Monday to Chicken Alfredo" | `swap: Monday → Chicken Alfredo` |
| "Change Tuesday to pasta" | `swap: Tuesday → pasta` |
| "Instead of tacos, do burgers" | `swap: tacos → burgers` |
| "Remove Wednesday" / "Skip Friday" | `remove: Wednesday` |
| "No need for Sunday dinner" | `remove: Sunday` |
| "Add Spaghetti on Sunday" | `add: Sunday → Spaghetti` |

#### Status Tracking

```
📊 Dinner Plan Tracking Status
═══════════════════════════════════════
Status:        SENT
Session ID:    sess_1739329272_abc123
Week of:       2/15/2026
Hours elapsed: 3
───────────────────────────────────────
📧 Email opened:   ⏳ No
💬 Reply received: ⏳ No
✅ Confirmed:      ⏳ No
📱 SMS sent:       ⏳ No
═══════════════════════════════════════
```

#### Configuration Files Required

```bash
# SMTP (existing)
.secrets/icloud-smtp.json

# NEW: Twilio for SMS
.secrets/twilio.json
{
  "accountSid": "AC...",
  "authToken": "...",
  "fromNumber": "+1..."
}

# NEW: Unsplash for images  
.secrets/unsplash.json
{
  "accessKey": "..."
}
```

#### SMS Fallback Logic

1. Email sent → Status: `sent`
2. 6 hours pass with no reply → SMS sent
3. SMS reply can trigger same actions as email
4. Status tracked independently of channel

### Stock Management System

Two separate lists manage items excluded from shopping:

**1. Weekly Exclusions** (`weekly-exclusions.json`)
- **Temporary** - resets every Saturday 9 AM
- Use when: "Just bought olive oil yesterday"
- Duration: Current week only

**2. Long-Term Stock** (`long-term-stock.json`)
- **Permanent** - pantry staples always kept
- Use when: "We always keep garlic on hand"
- Duration: All future meal plans

**Commands:**
```bash
# Weekly exclusions (temporary)
node stock-manager.js --weekly-add "Olive oil" "Just bought"
node stock-manager.js --weekly-remove "Garlic"

# Long-term stock (permanent)
node stock-manager.js --stock-add "Soy sauce" condiments_and_sauces
node stock-manager.js --stock-remove "Ketchup"

# View both lists
node stock-manager.js --list
```

### How to Make Changes

**Via Email Reply (NLP-powered):**

| Say This | Action |
|----------|--------|
| "Looks good!" / "Perfect" / "Yes" | Confirm all meals |
| "Swap Monday to Chicken Alfredo" | Change Monday's meal |
| "Instead of tacos, let's do burgers" | Swap tacos → burgers |
| "Remove Wednesday" / "Skip Friday" | Remove that day's meal |
| "Add Sunday: Spaghetti Carbonara" | Add a new meal |

**Via SMS Reply (after 6h fallback):**
- Same commands work via text message
- Reply to the Twilio number

**Changes are automatically:**
- ✅ Parsed with NLP (understands variations)
- ✅ Applied to weekly plan
- ✅ Synced to Apple Calendar
- ✅ Updated in HEB extension
- ✅ Tracked (sent → opened → replied → confirmed)
- ✅ Confirmed via email

### Cron Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| `dinner-plan-generator` | Sat 9:00 AM | Generate weekly meal plan |
| `dinner-plan-email-saturday` | Sat 9:05 AM | Send confirmation email |
| `dinner-email-reply-check` | 10 AM, 2 PM, 6 PM daily | Check for email replies |
| `youtube-cache-rebuild` | Sun 2:00 AM | Refresh YouTube video links |
| `apple-calendar-sync` | Every 15 min | Sync to Apple Calendar |
| `heb-cart-continuous-sync` | Every 30 min | Sync HEB cart status |

### Automation Schedule
- **Primary Run:** Saturdays 9:00 AM (HEB cart + calendar sync)
- **Calendar Sync:** Every 15 minutes (background)
- **Retry Policy:** 3 attempts with exponential backoff for HEB automation

## Open Questions
- [ ] Current brokerage / investment accounts?
- [ ] What tax docs does Alexander already have vs. need to collect?
- [ ] How many machine shops is Vectarr targeting initially? Geography?

## Credentials & Access

### Email Configuration
**Primary Email:** MarvinMartian9@icloud.com  
**Status:** ✅ Default for all automation emails

**Email Addresses:**
- **Marvin (AI):** MarvinMartian9@icloud.com — Sends all automation emails
- **Alexander:** alex@1v1a.com — Receives all automation emails

**SMTP Settings (iCloud):**
| Setting | Value |
|---------|-------|
| **Server** | smtp.mail.me.com |
| **Port** | 587 |
| **Security** | STARTTLS |
| **Username** | MarvinMartian9@icloud.com |
| **Password** | Stored in `.secrets/icloud-smtp.json` |
| **Status** | ✅ **Active** — Auto-sending enabled (Feb 10, 2026) |

**iCloud Integrations Status:**
| Feature | Status | Cron Schedule |
|---------|--------|---------------|
| **SMTP Email** | ✅ Working | On-demand via scripts |
| **Dinner Plan Email** | ✅ Auto-send | Saturdays 9:05 AM |
| **Email Reply Check** | ✅ **Rolling** | Every 5 minutes (instant detection) |
| **Apple Calendar Sync** | ✅ Working | Every 15 minutes |
| **YouTube Cache** | ✅ Enabled | Sundays 2:00 AM |

**Why iCloud:**
- Integrated with Apple ecosystem (Calendar, Reminders)
- Better deliverability for Apple users
- Secure and reliable
- Consistent with existing infrastructure

---

### Dinner Automation — MICROSOFT EDGE ONLY
**Primary Browser:** Microsoft Edge for all dinner automation  
**Status:** ✅ **Fully Automated** — No manual intervention required

**Chrome Status:** ❌ **NOT USED for dinner automation** — Chrome reserved for Facebook Marketplace only

**Why Edge:**
- Cleaner profile management (no conflicts)
- Bypasses HEB bot detection when logged in
- Stable CDP connection for automation
- Separate from Chrome Facebook sessions

**Why Single Profile:**
- Eliminates profile lock conflicts
- Consistent login sessions (Facebook, HEB)
- No "restore session" dialogs
- Reliable automation across all scripts

**System Architecture:**
```
Automation Architecture (Zero Manual Intervention)
├── Google Chrome — Marvin Profile ONLY (Shared Instance)
│   ├── Facebook Marketplace (F-150 monitoring/sharing)
│   └── HEB Cart (with extension support)
│   └── All scripts connect via CDP (debug port 9222)
└── Apple Calendar — Direct CalDAV sync (every 15 min)
```

**Chrome Sharing:**
- ONE Chrome instance runs on debug port 9222
- All automation scripts connect via CDP (Chrome DevTools Protocol)
- No more multiple Chrome windows launching
- Scripts share the same browser context

**Credentials:**
- **Facebook:** alex@xspqr.com / section9
- **HEB:** Uses Chrome extension data

**Scripts (All use Shared Chrome):**
```bash
# Launch shared Chrome (run once, keeps running)
node dinner-automation/scripts/launch-shared-chrome.js

# Facebook Marketplace (connects to shared Chrome)
node dinner-automation/scripts/facebook-marketplace-shared.js --messages
node dinner-automation/scripts/facebook-marketplace-shared.js --share-f150

# HEB Cart (connects to shared Chrome)
node dinner-automation/scripts/heb-cart-shared.js

# Check Chrome status
node dinner-automation/scripts/launch-shared-chrome.js --status

# Stop shared Chrome
node dinner-automation/scripts/launch-shared-chrome.js --stop
```

**Shared Chrome Benefits:**
- ONE Chrome instance for all automation
- Scripts connect via CDP (port 9222)
- No more "Chrome already in use" errors
- No more profile lock conflicts
- Faster script execution (no browser launch time)

**Cron Jobs:**
| Job | Schedule | Purpose |
|-----|----------|---------|
| `Facebook Marketplace Monitor` | Hourly 8am-9pm | Check buyer messages |
| `F-150 + Thule Weekly Share` | **Fridays 6:00 PM** | Share both listings to all groups |
| `Facebook Daily Report` | **Daily 8:00 PM** | Outreach summary for day/week |
| `Group Discovery` | **Wednesdays 7:00 PM** | Find new groups within 80mi |
| `HEB Cart + Dinner` | Saturdays 9am | Shopping + calendar |
| `Apple Calendar Sync` | Every 15 min | Two-way sync |

**Note:** All automation uses Chrome with Marvin profile. Edge is NOT used.

### Facebook Marketplace Listings - Group Sharing

**Active Listings:**
- 🚗 **F-150 Truck** - Main listing
- 📦 **Thule Box** - Roof cargo box

**Sharing Schedule:**
- **Weekly:** Every Friday at 6:00 PM
- **Target:** All 3 local groups (simultaneous share)
- **Scope:** Sunfield/Buda + 80 mile radius search ongoing

**Current Groups (3 active):**
- HAYS COUNTY LIST & SELL ✓ (last used: 2026-02-07 04:54 PM)
- Austin Buy Sell Trade — *not a member, used Buda/Kyle instead*
- Buda/Kyle Buy, Sell & Rent ✓ (last used: 2026-02-07 02:54 PM)
- Austin Cars & Trucks - For Sale — *not a member*
- Buda Buy & Sell — *not a member*
- Kyle Buy Sell Trade — *not a member*
- San Marcos Buy Sell Trade — *not a member*
- South Austin Buy Sell Trade — *not a member*
- Ventas De Austin, Buda, Kyle ✓ (last used: 2026-02-07 05:54 PM)

**Status (2026-02-07):** Shared to Ventas De Austin, Buda, Kyle at 5:54 PM ✓ (just completed)

**Next group in rotation:** Buda/Kyle Buy, Sell & Rent

**Available groups Alexander is a member of:**
- HAYS COUNTY LIST & SELL (Public)
- Buda/Kyle Buy, Sell & Rent (Public)
- Ventas De Austin, Buda, Kyle (Public)

**Groups NOT a member of:** Austin Buy Sell Trade, Austin Cars & Trucks - For Sale, Buda Buy & Sell, Kyle Buy Sell Trade, San Marcos Buy Sell Trade, South Austin Buy Sell Trade

**Sharing History:**
- 2026-02-09 10:01 AM: Ventas De Austin, Buda, Kyle ⚠️ (auto-launched, manual completion required)
- 2026-02-08 01:00 PM: Ventas De Austin, Buda, Kyle ⚠️ (auto-launched, manual completion required)
- 2026-02-07 05:54 PM: Ventas De Austin, Buda, Kyle ✓ (just completed)
- 2026-02-07 04:54 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 02:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 01:02 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 12:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 12:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 12:03 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-07 11:54 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 11:27 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 11:02 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 10:54 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 10:27 AM: Ventas De Austin, Buda, Kyle ✓ (just completed)
- 2026-02-07 10:02 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 09:54 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 09:27 AM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-07 09:02 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 08:54 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 08:27 AM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-07 08:02 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 07:54 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-07 07:27 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-07 07:00 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 08:54 PM: Ventas De Austin, Buda, Kyle ✓ (just completed)
- 2026-02-06 08:27 PM: Buda/Kyle Buy, Sell & Rent ✓ (just completed)
- 2026-02-06 08:01 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 07:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 07:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 07:03 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 06:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 06:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 06:01 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 05:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 05:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 05:03 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 04:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 04:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 04:02 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 03:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 03:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 03:02 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 02:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 02:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 02:01 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 01:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 01:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 01:01 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 12:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 12:27 PM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 12:03 PM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 11:54 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 11:02 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 10:54 AM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 10:27 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 10:02 AM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 09:54 AM: HAYS COUNTY LIST & SELL ✓ (just completed)
- 2026-02-06 09:27 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 09:04 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 08:54 AM: Ventas De Austin, Buda, Kyle ✓
- 2026-02-06 08:27 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 08:05 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-06 07:54 AM: Buda/Kyle Buy, Sell & Rent ✓
- 2026-02-06 07:27 AM: Ventas De Austin, Buda, Kyle ✓ (just completed)
- 2026-02-06 07:00 AM: HAYS COUNTY LIST & SELL ✓
- 2026-02-05 08:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 08:27 PM: Ventas De Austin, Buda, Kyle ✓
- 08:02 PM: HAYS COUNTY LIST & SELL ✓
- 07:54 PM: Ventas De Austin, Buda, Kyle ✓
- 07:27 PM: Buda/Kyle Buy, Sell & Rent ✓
- 07:02 PM: HAYS COUNTY LIST & SELL ✓
- 06:54 PM: Ventas De Austin, Buda, Kyle ✓
- 06:27 PM: Buda/Kyle Buy, Sell & Rent ✓
- 06:01 PM: HAYS COUNTY LIST & SELL ✓
- 05:54 PM: Ventas De Austin, Buda, Kyle ✓
- 05:27 PM: Buda/Kyle Buy, Sell & Rent ✓
- 05:02 PM: HAYS COUNTY LIST & SELL ✓
- 04:54 PM: Ventas De Austin, Buda, Kyle ✓
- 04:27 PM: Buda/Kyle Buy, Sell & Rent ✓
- 04:03 PM: HAYS COUNTY LIST & SELL ✓
- 03:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 03:27 PM: Ventas De Austin, Buda, Kyle ✓
- 03:02 PM: HAYS COUNTY LIST & SELL ✓
- 02:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 02:27 PM: Ventas De Austin, Buda, Kyle ✓
- 02:01 PM: HAYS COUNTY LIST & SELL ✓
- 01:54 PM: Buda/Kyle Buy, Sell & Rent ✓
- 01:27 PM: HAYS COUNTY LIST & SELL ✓
- 12:54 PM: Ventas De Austin, Buda, Kyle ✓
- 12:27 PM: HAYS COUNTY LIST & SELL ✓
- 12:03 PM: Buda/Kyle Buy, Sell & Rent ✓
- 11:54 AM: Ventas De Austin, Buda, Kyle ✓
- 11:27 AM: HAYS COUNTY LIST & SELL ✓
- 11:02 AM: Buda/Kyle Buy, Sell & Rent ✓
- 10:54 AM: HAYS COUNTY LIST & SELL ✓
- 10:02 AM: Ventas De Austin, Buda, Kyle ✓
- 09:54 AM: Buda/Kyle Buy, Sell & Rent ✓
- 09:27 AM: HAYS COUNTY LIST & SELL ✓

**Target Expansion (80 mile radius):**
Searching for new groups in: Austin metro, San Marcos, New Braunfels, Dripping Springs, Round Rock, Cedar Park, Leander, Pflugerville, Lakeway, Bee Cave, Spicewood, Lockhart, Bastrop, Elgin, Seguin, San Antonio north

**Reporting:**
- **Daily Report:** Every day at 8:00 PM with outreach summary
- **Weekly Shares:** Fridays 6:00 PM (F-150 + Thule to all groups)
- **Group Discovery:** Wednesdays 7:00 PM (search for new groups)

**Available groups Alexander is a member of:**
- HAYS COUNTY LIST & SELL (Public)
- Buda/Kyle Buy, Sell & Rent (Public)
- Ventas De Austin, Buda, Kyle (Public)

**Groups NOT a member of:** Austin Buy Sell Trade, Austin Cars & Trucks - For Sale, Buda Buy & Sell, Kyle Buy Sell Trade, San Marcos Buy Sell Trade, South Austin Buy Sell Trade

## Agent Capabilities & Tools

### DEFAULT: Multi-Agent Approach (Feb 11, 2026)
**All tasks use complex multi-agent reasoning by default.**

Reference: `docs/SUB-AGENT-REASONING-PATTERNS.md`

**Standard workflow for any non-trivial task:**
1. **Decomposition** — Spawn parallel sub-agents for sub-problems
2. **Verification** — Have separate agent critique/verify results
3. **Synthesis** — Combine outputs into final deliverable

**Exception:** Simple queries (< 2 min to answer) can use single-agent.

**Patterns available:**
- **Chain-of-thought decomposition** — Parallel sub-problems
- **Verification pattern** — One reasons, one critiques
- **Expert specialization** — Domain-specific agents
- **Iterative refinement** — Successive improvement

### Anti-Bot Automation
Reference: `dinner-automation/docs/ANTI-BOT-PLAYBOOK.md`

Techniques for sites that block automation:
- Stealth injection (hide webdriver/plugins)
- Fingerprint randomization (unique sessions)
- Request interception (strip automation headers)
- Human-like behavior (timing, mouse, typing)
- Session warming (build trust over days)
- Canvas/WebGL spoofing (advanced fingerprinting)

---

## Lessons Learned
*(Will update as I learn what works and what doesn't)*

---

## HEB Cart Automation — WORKING METHOD (Feb 11, 2026)

### ✅ VERIFIED WORKING: Per-Item Verification with Playwright + CDP

**Status:** Successfully added 42/42 items (100%) on Feb 11, 2026  
**Method:** Playwright connecting to logged-in **Microsoft Edge** via CDP with strict per-item verification
**Browser:** Microsoft Edge (Marvin Profile) — **NOT Chrome**

### The Working Process

**1. Pre-Requirements:**
- **Microsoft Edge** must be running on debug port 9222 with user logged into HEB
- **Profile:** `C:\Users\Admin\AppData\Local\Microsoft\Edge\User Data\Marvin`
- Use `dinner-automation/scripts/launch-shared-chrome.js` to start if needed (launches Edge, not Chrome)
- Verify connection: `node dinner-automation/scripts/heb-add-cart.js --status`

**2. Core Principles (MUST FOLLOW for all HEB tasks):**
- ✅ **Connect via CDP only** — Never launch new browser instance
- ✅ **Per-item verification** — Check cart count BEFORE and AFTER each item
- ✅ **Strict retry logic** — Retry same item immediately on failure, don't skip
- ✅ **Human-like delays** — Random 3-8s between items, 10-15s between batches
- ✅ **Stop on persistent failure** — After 3 retries on same item, stop and alert

**3. Button Detection (CRITICAL):**
- **CORRECT:** `button[data-qe-id="addToCart"]` — This adds to cart
- **WRONG:** `button[data-qe-id="addToList"]` — This adds to wishlist
- HEB has TWO buttons; aria-label containing "add" matches both
- Always use data-qe-id for precision

**4. Cart Count Verification:**
- Extract from: `a[data-testid="cart-link"]` aria-label
- Format: `"Go to Cart page. X items in your cart."`
- Regex: `/(>d+)\s+items?\s+in\s+your\s+cart/i`

**5. Working Scripts:**
```bash
# Launch Edge for HEB automation (run once)
node dinner-automation/scripts/launch-shared-chrome.js

# Add all items from meal plan (42 items)
node dinner-automation/scripts/heb-add-cart.js

# Add only missing items (smart resume)
node dinner-automation/scripts/heb-add-missing.js

# Check cart status
node dinner-automation/scripts/heb-add-cart.js --status
```

**Note:** Despite the script name containing "chrome", these scripts connect to **Microsoft Edge** on port 9222. Edge is the designated browser for all dinner/HEB automation per TOOLS.md configuration.

**6. Anti-Bot Patterns Applied:**
- Random delays: `Math.floor(Math.random() * (max - min + 1)) + min`
- Batch processing: Groups of 5 items with 10-15s pause
- Session warmup: Visit homepage + scroll before automation
- Human-like clicks: Variable delay (100-400ms) on click actions
- Scroll simulation: `window.scrollTo(0, 400)` before finding buttons

### What Does NOT Work (Learned from Failures):
- ❌ Browser extensions (content scripts detected by HEB)
- ❌ Playwright stealth/puppeteer-extra plugins
- ❌ Fresh browser instances (triggers bot detection)
- ❌ Rapid sequential requests (rate limited)
- ❌ Batch processing without verification (silent failures)
- ❌ Skipping failed items (leads to incomplete carts)

### Files:
- `dinner-automation/scripts/heb-add-cart.js` — Full meal plan automation (uses Edge via CDP)
- `dinner-automation/scripts/heb-add-missing.js` — Resume/add missing only (uses Edge via CDP)
- `dinner-automation/scripts/launch-shared-chrome.js` — Start **Edge** for CDP (script name says Chrome but launches Edge)
- `docs/ANTI-BOT-PLAYBOOK.md` — Reusable patterns for all bot detection

### 🔧 FIX APPLIED (Feb 14, 2026) - Cart Count Detection
**Problem:** HEB changed their cart link structure. The aria-label no longer includes item count (was: "Go to Cart page. X items in your cart", now: just "Go to Cart page"). This caused all verification to fail.

**Root Cause:** 
- Buttons were clicking successfully
- Cart count verification was failing because script expected item count in aria-label
- HEB now stores cart data in `localStorage.PurchaseCart`

**Solution:**
Updated `getCartCount()` function in `heb-add-cart.js` to:
1. **Primary:** Read cart count from `localStorage.PurchaseCart.ProductNames` (split by `<SEP>`)
2. **Fallback:** Check `localStorage.PurchaseCart.Products` array length
3. **Legacy:** Keep old aria-label method as final fallback

**Code Change:**
```javascript
// NEW: Primary method - read from localStorage (most reliable)
const storageCount = await page.evaluate(() => {
  try {
    const raw = localStorage.getItem('PurchaseCart');
    if (!raw) return 0;
    const cartData = JSON.parse(raw);
    
    if (cartData.ProductNames) {
      const items = cartData.ProductNames.split('<SEP>').filter(n => n.trim());
      return items.length;
    }
    
    if (cartData.Products && Array.isArray(cartData.Products)) {
      return cartData.Products.length;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
});
```

### Success Metrics (Feb 11, 2026):
- **Items added:** 42/42 (100%)
- **Verification rate:** 100% (every item confirmed in cart)
- **Failed items:** 0
- **Bot detection triggered:** 0
- **Time taken:** ~20 minutes for 42 items with verification

### Future HEB Tasks MUST Use:
1. **CDP connection** to existing Chrome instance
2. **Per-item verification** with cart count check
3. **Retry-on-failure** (don't skip to next item)
4. **Random delays** between actions
5. **Report progress** every 5 items with exact cart count
