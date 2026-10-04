#!/usr/bin/env bash
# POS self-checkout end-to-end check (spec §7).
#
# Requires a running pushcart-web and a reachable Supabase. Seeds its own station,
# product and class mapping, then walks the integration and asserts each step.
#
# Env:
#   APP_URL                 default http://localhost:3000
#   POS_INGEST_SECRET       required; must match the app's .env
#   NEXT_PUBLIC_SUPABASE_URL  default from the environment
#   SUPABASE_SECRET_KEY       default from the environment
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  for the customer's own direct-write probe
#   POS_STAFF_PIN           required; must match the app's .env (staff removal)
#
# Usage: bash scripts/pos-e2e.sh
set -uo pipefail

APP_URL="${APP_URL:-http://localhost:3000}"
SB_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SB_KEY="${SUPABASE_SECRET_KEY:-}"

if [[ -z "${POS_INGEST_SECRET:-}" ]]; then
  echo "POS_INGEST_SECRET is required" >&2
  exit 2
fi
if [[ -z "${POS_STAFF_PIN:-}" ]]; then
  echo "POS_STAFF_PIN is required (staff removal is the only manual correction)" >&2
  exit 2
fi
if [[ -z "$SB_URL" || -z "$SB_KEY" ]]; then
  echo "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required" >&2
  exit 2
fi

WORK="$(mktemp -d)"
COOKIE="$WORK/one.txt"
COOKIE2="$WORK/two.txt"
PASS=0
FAIL=0

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

ok()   { PASS=$((PASS + 1)); echo "  ok   - $1"; }
bad()  { FAIL=$((FAIL + 1)); echo "  FAIL - $1"; }
check() { if [[ "$2" == "$3" ]]; then ok "$1"; else bad "$1 (expected [$3], got [$2])"; fi; }

# Read a dotted path out of JSON on stdin.
jqr() {
  node -e 'const p=process.argv[1].split(".");let o;try{o=JSON.parse(require("fs").readFileSync(0,"utf8"))}catch(e){process.stdout.write("");process.exit(0)}let v=o;for(const k of p){if(k==="")continue;v=(v==null?undefined:v[k])}process.stdout.write(v==null?"":String(v))' "$1"
}

rest() {
  # rest METHOD PATH [JSON]
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -s -X "$method" "$SB_URL/rest/v1/$path" \
      -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY" \
      -H "Content-Type: application/json" -H "Prefer: return=representation,resolution=merge-duplicates" \
      -d "$body"
  else
    curl -s -X "$method" "$SB_URL/rest/v1/$path" \
      -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY"
  fi
}

pos_get() {
  curl -s -o "$WORK/body" -w '%{http_code}' \
    "$APP_URL/api/pos/session?station_id=$1" -H "x-pos-token: $POS_INGEST_SECRET"
}

pos_sync() {
  # pos_sync SESSION_REF ITEMS_JSON [EXTRA_JSON_FIELDS] -> http code, body in $WORK/body
  local extra="${3:-}"
  curl -s -o "$WORK/body" -w '%{http_code}' -X POST "$APP_URL/api/pos/sync" \
    -H "x-pos-token: $POS_INGEST_SECRET" -H 'Content-Type: application/json' \
    -d "{\"session_ref\":\"$1\",\"station_id\":\"$STATION\",\"items\":$2${extra:+,$extra}}"
}

staff_remove() {
  # staff_remove COOKIE CART PRODUCT QTY PIN -> http code, body in $WORK/body
  curl -s -o "$WORK/body" -w '%{http_code}' -b "$1" -X POST \
    "$APP_URL/api/protected/station-session/items/$3/staff-remove" \
    -H 'Content-Type: application/json' \
    -d "{\"cart_id\":\"$2\",\"quantity\":$4,\"pin\":\"$5\"}"
}

# The customer's own access token, read out of the Supabase SSR cookie in a curl jar (the
# value is `base64-<json>`, possibly split into .0/.1 chunks).
customer_token() {
  node -e '
    const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n");
    const parts = {};
    for (const l of lines) {
      const f = l.replace(/^#HttpOnly_/, "").split("\t");
      if (f.length < 7) continue;
      const m = /^(sb-.+-auth-token)(?:\.(\d+))?$/.exec(f[5]);
      if (m) parts[Number(m[2] ?? 0)] = f[6];
    }
    let v = Object.keys(parts).sort((a, b) => a - b).map((k) => parts[k]).join("");
    v = decodeURIComponent(v);
    if (v.startsWith("base64-")) v = Buffer.from(v.slice(7), "base64").toString("utf8");
    try { process.stdout.write(JSON.parse(v).access_token || ""); } catch { process.stdout.write(""); }
  ' "$1"
}

echo "POS e2e against $APP_URL"

STATION="e2e-counter-$$"
CLASS="e2e_class_$$"
CLASS2="e2e_class2_$$"

# --- seed ----------------------------------------------------------------
rest POST 'stations' "{\"id\":\"$STATION\",\"name\":\"E2E Counter\"}" >/dev/null
PRODUCT_ID="$(rest POST 'products' "{\"name\":\"E2E Item $$\",\"price\":10,\"stock_quantity\":100}" | jqr '0.id')"
if [[ -z "$PRODUCT_ID" ]]; then echo "could not seed a product" >&2; exit 2; fi
rest POST 'product_class_map' "{\"class_slug\":\"$CLASS\",\"product_id\":\"$PRODUCT_ID\"}" >/dev/null
rest POST 'product_class_map' "{\"class_slug\":\"$CLASS2\",\"product_id\":\"$PRODUCT_ID\"}" >/dev/null
echo "seeded station=$STATION product=$PRODUCT_ID"

# --- unknown station -> 404 ---------------------------------------------
code="$(pos_get "nope-$STATION")"
check "unknown station -> 404" "$code" "404"

# --- wrong token -> 401 --------------------------------------------------
code="$(curl -s -o /dev/null -w '%{http_code}' "$APP_URL/api/pos/session?station_id=$STATION" -H 'x-pos-token: wrong')"
check "bad token -> 401" "$code" "401"

# --- first customer opens a session -------------------------------------
LOGIN="$(curl -s -c "$COOKIE" -X POST "$APP_URL/api/auth" -H 'Content-Type: application/json' -d '{"type":"customer-sign-in"}')"
CART="$(printf '%s' "$LOGIN" | jqr 'data.cart.id')"
USER="$(printf '%s' "$LOGIN" | jqr 'data.user.id')"
if [[ -z "$CART" ]]; then echo "anonymous sign-in failed: $LOGIN" >&2; exit 2; fi

OPEN="$(curl -s -b "$COOKIE" -X POST "$APP_URL/api/protected/station-session" -H 'Content-Type: application/json' -d "{\"station_id\":\"$STATION\",\"cart_id\":\"$CART\"}")"
REF="$(printf '%s' "$OPEN" | jqr 'data.session_ref')"
if [[ -z "$REF" ]]; then echo "open session failed: $OPEN" >&2; exit 2; fi
ok "session opened ($REF)"

# --- session poll sees it -----------------------------------------------
code="$(pos_get "$STATION")"
check "session poll -> 200" "$code" "200"

# --- sync adds -----------------------------------------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "sync add -> 200" "$code" "200"
check "sync add status" "$(jqr 'data.results.0.status' <"$WORK/body")" "added"

rows="$(rest GET "cart_items?cart_id=eq.$CART&session_ref=not.is.null&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
check "one camera row" "$rows" "1"

# --- identical sync is a no-op ------------------------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "no-op sync -> 200" "$code" "200"
rows="$(rest GET "cart_items?cart_id=eq.$CART&session_ref=not.is.null&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
check "no duplicate row" "$rows" "1"

# --- the camera loses sight of the item, then sees it again ---------------
# SCANnCART holds a posted quantity as a floor, so a taken item reads as `lost: true` rather
# than as a lower count. pos_reconcile stamps camera_lost_at on the first such sync, leaves the
# stamp (and last_activity_at) alone on repeats, and clears it the first sync without the flag.
lost_at() { rest GET "cart_items?cart_id=eq.$CART&session_ref=not.is.null&select=camera_lost_at" | jqr '0.camera_lost_at'; }
activity() { rest GET "station_sessions?session_ref=eq.$REF&select=last_activity_at" | jqr '0.last_activity_at'; }
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1,\"lost\":true}]")"
check "lost sync -> 200" "$code" "200"
stamp="$(lost_at)"
[[ -n "$stamp" ]] && ok "camera_lost_at stamped" || bad "camera_lost_at not stamped"
before_activity="$(activity)"
sleep 1
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1,\"lost\":true}]")"
check "repeated lost sync -> 200" "$code" "200"
check "a repeat keeps the first stamp" "$(lost_at)" "$stamp"
check "a repeat is not customer activity" "$(activity)" "$before_activity"
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "seen-again sync -> 200" "$code" "200"
check "camera_lost_at cleared" "$(lost_at)" ""
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1,\"lost\":\"abc\"}]")"
check "non-boolean lost -> 400" "$code" "400"

# --- two classes map to one product are summed ---------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1},{\"class_name\":\"$CLASS2\",\"quantity\":2}]")"
check "summed sync -> 200" "$code" "200"
qty="$(rest GET "cart_items?cart_id=eq.$CART&session_ref=not.is.null&select=quantity" | jqr '0.quantity')"
check "summed quantity" "$qty" "3"

# --- unmapped class is reported, never inserted --------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"totally_unmapped_$$\",\"quantity\":1}]")"
check "unmapped sync -> 200" "$code" "200"
check "unmapped status" "$(jqr 'data.results.0.status' <"$WORK/body")" "unmapped"

# --- empty snapshot removes ---------------------------------------------
code="$(pos_sync "$REF" "[]")"
check "empty snapshot -> 200" "$code" "200"
rows="$(rest GET "cart_items?cart_id=eq.$CART&session_ref=not.is.null&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
check "rows deleted" "$rows" "0"

# --- customers cannot edit the camera's cart ---------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":5}]")"
check "re-add -> 200" "$code" "200"
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" -X PUT \
  "$APP_URL/api/protected/station-session/items/$PRODUCT_ID" \
  -H 'Content-Type: application/json' -d "{\"cart_id\":\"$CART\",\"quantity\":9}")"
check "customer edit -> 403" "$code" "403"
check "customer edit refused as disabled" "$(jqr 'error' <"$WORK/body")" "customer_edits_disabled"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" -X DELETE \
  "$APP_URL/api/protected/station-session/items/$PRODUCT_ID?cart_id=$CART")"
check "customer remove -> 403" "$code" "403"
qty="$(rest GET "cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID&select=quantity" | jqr '0.quantity')"
check "camera quantity untouched" "$qty" "5"

# The customer's browser holds a Supabase token: writing cart_items directly, around every
# route, must be refused by the database itself.
TOKEN="$(customer_token "$COOKIE")"
if [[ -z "$TOKEN" ]]; then
  bad "could not read the customer's token from the cookie jar"
else
  # The token must be live, or the refusals below would only be a 401 proving nothing.
  seen="$(curl -s "$SB_URL/rest/v1/cart_items?cart_id=eq.$CART&select=id"     -H "apikey: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-$SB_KEY}" -H "Authorization: Bearer $TOKEN" |
    node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{console.log(JSON.parse(d).length)}catch{console.log("x")}})')"
  check "customer token reads its own cart" "$seen" "1"
  curl -s -o /dev/null -X PATCH "$SB_URL/rest/v1/cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-$SB_KEY}" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"quantity":1}'
  curl -s -o /dev/null -X POST "$SB_URL/rest/v1/cart_items" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-$SB_KEY}" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"cart_id\":\"$CART\",\"product_id\":\"$PRODUCT_ID\",\"quantity\":1}"
  qty="$(rest GET "cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID&select=quantity" | jqr '0.quantity')"
  rows="$(rest GET "cart_items?cart_id=eq.$CART&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
  check "direct customer write refused (quantity)" "$qty" "5"
  check "direct customer insert refused (rows)" "$rows" "1"
fi

# --- staff removal: the one manual correction, decrease-only -----------
code="$(staff_remove "$COOKIE" "$CART" "$PRODUCT_ID" 1 "not-$POS_STAFF_PIN")"
check "wrong staff PIN -> 403" "$code" "403"
check "wrong PIN refused as invalid" "$(jqr 'error' <"$WORK/body")" "staff_pin_invalid"
code="$(staff_remove "$COOKIE" "$CART" "$PRODUCT_ID" 9 "$POS_STAFF_PIN")"
check "staff cannot remove more than is there -> 400" "$code" "400"
code="$(staff_remove "$COOKIE" "$CART" "$PRODUCT_ID" 1 "$POS_STAFF_PIN")"
check "staff remove 1 -> 200" "$code" "200"
qty="$(rest GET "cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID&select=quantity" | jqr '0.quantity')"
check "quantity lowered by one" "$qty" "4"
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":5}]")"
check "post-staff sync -> 200" "$code" "200"
check "camera no longer manages it" "$(jqr 'data.results.0.status' <"$WORK/body")" "overridden"
qty="$(rest GET "cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID&select=quantity" | jqr '0.quantity')"
check "staff quantity stands" "$qty" "4"
logged="$(rest GET "pos_sync_log?session_ref=eq.$REF&kind=eq.staff_edit&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
check "staff edit logged" "$logged" "1"

# --- a second customer cannot touch the first cart -----------------------
LOGIN2="$(curl -s -c "$COOKIE2" -X POST "$APP_URL/api/auth" -H 'Content-Type: application/json' -d '{"type":"customer-sign-in"}')"
CART2="$(printf '%s' "$LOGIN2" | jqr 'data.cart.id')"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/station-session/finish" -H 'Content-Type: application/json' \
  -d "{\"cart_id\":\"$CART\"}")"
check "foreign finish -> 403" "$code" "403"
code="$(staff_remove "$COOKIE2" "$CART" "$PRODUCT_ID" 1 "$POS_STAFF_PIN")"
check "foreign staff remove -> 403 (a PIN is not a licence for any cart)" "$code" "403"

# --- cart reads enforce ownership and reject malformed IDs -------------
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" \
  "$APP_URL/api/protected/cart_items/$CART/active")"
check "foreign cart read -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" \
  "$APP_URL/api/protected/cart_items/$CART/active")"
check "own cart read -> 200" "$code" "200"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" \
  "$APP_URL/api/protected/cart_items/not-a-cart/active")"
check "malformed cart read -> 400" "$code" "400"

# --- legacy routes must not bypass POS ownership -----------------------
for path in "cart/$CART" "cart/get_one/$CART"; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" "$APP_URL/api/protected/$path")"
  check "foreign $path read -> 403" "$code" "403"
done
ITEM_ID="$(rest GET "cart_items?cart_id=eq.$CART&select=id" | jqr '0.id')"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X PUT \
  "$APP_URL/api/protected/cart_items/$ITEM_ID" -H 'Content-Type: application/json' \
  -d '{"type":"update-quantity","quantity":5}')"
check "foreign legacy item edit -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X PUT \
  "$APP_URL/api/protected/cart/$CART" -H 'Content-Type: application/json' \
  -d '{"type":"update-cart-status","status":"active"}')"
check "foreign legacy cart edit -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/cart_items" -H 'Content-Type: application/json' \
  -d "{\"type\":\"add-to-cart\",\"cartId\":\"$CART\",\"productId\":\"$PRODUCT_ID\"}")"
check "foreign legacy item insert -> 403" "$code" "403"
# Use a disposable row so a pre-fix delete probe cannot destroy the checkout fixture.
PROBE_ITEM="$(rest POST 'cart_items' "{\"cart_id\":\"$CART\",\"product_id\":\"$PRODUCT_ID\",\"quantity\":1}" | jqr '0.id')"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X DELETE \
  "$APP_URL/api/protected/cart_items/$PROBE_ITEM")"
check "foreign legacy item delete -> 403" "$code" "403"
# Remove only the disposable/manual probe rows, leaving the original edited row intact.
rest DELETE "cart_items?cart_id=eq.$CART&id=neq.$ITEM_ID" >/dev/null
for path in profiles orders dashboard/2026 pos-overview; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" "$APP_URL/api/protected/$path")"
  check "customer $path read -> 403" "$code" "403"
done
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X PUT \
  "$APP_URL/api/protected/profiles/update/$USER" \
  -F 'type=update-user-info' -F 'role=user' -F 'first_name=Foreign probe')"
check "foreign profile edit -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Cookie: sb-${NEXT_PUBLIC_SUPABASE_TOKEN:-127}-auth-token=forged" \
  "$APP_URL/api/protected/products")"
check "forged auth cookie -> 401" "$code" "401"

# --- positive customer paths and privilege escalation -------------------
for path in "cart/$CART" "cart/get_one/$CART" cashiers products categories vat/all stations; do
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" "$APP_URL/api/protected/$path")"
  check "own/customer $path read -> 200" "$code" "200"
done
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X PUT \
  "$APP_URL/api/protected/profiles/update/$(printf '%s' "$LOGIN2" | jqr 'data.user.id')" \
  -F 'type=update-user-info' -F 'role=admin')"
check "customer self-promotion -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/orders" -H 'Content-Type: application/json' \
  -d "{\"type\":\"add-orders\",\"cart_id\":\"$CART\",\"user_id\":\"$USER\",\"subtotal\":0,\"vat_amount\":0,\"total_amount\":0}")"
check "customer legacy order insert -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" -X PUT \
  "$APP_URL/api/protected/cart/$CART" -H 'Content-Type: application/json' \
  -d '{"type":"update-cart-status","status":"paid"}')"
check "customer cannot bypass payment -> 403" "$code" "403"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE" -X PUT \
  "$APP_URL/api/protected/cart_items/$ITEM_ID" -H 'Content-Type: application/json' \
  -d '{"type":"update-quantity","quantity":5}')"
check "own legacy item edit on a camera cart -> 403" "$code" "403"

# --- second Start on a busy counter -> 409 ------------------------------
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/station-session" -H 'Content-Type: application/json' \
  -d "{\"station_id\":\"$STATION\",\"cart_id\":\"$CART2\"}")"
check "busy counter -> 409" "$code" "409"

# --- the scanner's review blocks Finish until it clears ----------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":5}]" '"pending_review":1,"review_reasons":["two items crossed the opening at once"]')"
check "sync with review -> 200" "$code" "200"
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" "$APP_URL/api/protected/station-session")"
check "tablet sees the review" "$(jqr 'data.pending_review' <"$WORK/body")" "1"
check "tablet sees the reason" "$(jqr 'data.review_reasons.0' <"$WORK/body")" "two items crossed the opening at once"
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" -X POST \
  "$APP_URL/api/protected/station-session/finish" -H 'Content-Type: application/json' \
  -d "{\"cart_id\":\"$CART\"}")"
check "finish under review -> 409" "$code" "409"
check "refused as review_pending" "$(jqr 'error' <"$WORK/body")" "review_pending"
code="$(pos_sync "$REF" "[]" '"pending_review":-1')"
check "negative review count -> 400" "$code" "400"
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":5}]")"
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" "$APP_URL/api/protected/station-session")"
check "a counter-mode sync leaves the review alone" "$(jqr 'data.pending_review' <"$WORK/body")" "1"
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":5}]" '"pending_review":0,"review_reasons":[]')"
check "review cleared -> 200" "$code" "200"

# --- insufficient stock blocks Finish -----------------------------------
rest PATCH "products?id=eq.$PRODUCT_ID" '{"stock_quantity":2}' >/dev/null
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" -X POST \
  "$APP_URL/api/protected/station-session/finish" -H 'Content-Type: application/json' \
  -d "{\"cart_id\":\"$CART\"}")"
check "short stock -> 409" "$code" "409"
cart_status="$(rest GET "carts?id=eq.$CART&select=status" | jqr '0.status')"
check "cart still active" "$cart_status" "active"
rest PATCH "products?id=eq.$PRODUCT_ID" '{"stock_quantity":100}' >/dev/null

# --- Finish creates the order and completes the session -----------------
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" -X POST \
  "$APP_URL/api/protected/station-session/finish" -H 'Content-Type: application/json' \
  -d "{\"cart_id\":\"$CART\"}")"
check "finish -> 200" "$code" "200"
ORDER_ID="$(jqr 'data.order_id' <"$WORK/body")"
if [[ -n "$ORDER_ID" ]]; then ok "order created ($ORDER_ID)"; else bad "no order id"; fi

orders="$(rest GET "orders?cart_id=eq.$CART&select=id" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length))')"
check "one order row" "$orders" "1"
cart_status="$(rest GET "carts?id=eq.$CART&select=status" | jqr '0.status')"
check "cart paid" "$cart_status" "paid"
sess_status="$(rest GET "station_sessions?session_ref=eq.$REF&select=status" | jqr '0.status')"
check "session completed" "$sess_status" "completed"
stock="$(rest GET "products?id=eq.$PRODUCT_ID&select=stock_quantity" | jqr '0.stock_quantity')"
check "stock deducted" "$stock" "96"

# --- a sync after Finish -> 409 -----------------------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "post-finish sync -> 409" "$code" "409"

echo
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
