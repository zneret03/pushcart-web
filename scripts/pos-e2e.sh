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
  # pos_sync SESSION_REF ITEMS_JSON -> http code, body in $WORK/body
  curl -s -o "$WORK/body" -w '%{http_code}' -X POST "$APP_URL/api/pos/sync" \
    -H "x-pos-token: $POS_INGEST_SECRET" -H 'Content-Type: application/json' \
    -d "{\"session_ref\":\"$1\",\"station_id\":\"$STATION\",\"items\":$2}"
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

# --- customer edit wins over the camera ---------------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "re-add -> 200" "$code" "200"
code="$(curl -s -o "$WORK/body" -w '%{http_code}' -b "$COOKIE" -X PUT \
  "$APP_URL/api/protected/station-session/items/$PRODUCT_ID" \
  -H 'Content-Type: application/json' -d "{\"cart_id\":\"$CART\",\"quantity\":5}")"
check "customer edit -> 200" "$code" "200"
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "post-edit sync -> 200" "$code" "200"
check "overridden status" "$(jqr 'data.results.0.status' <"$WORK/body")" "overridden"
qty="$(rest GET "cart_items?cart_id=eq.$CART&product_id=eq.$PRODUCT_ID&select=quantity" | jqr '0.quantity')"
check "edited quantity stands" "$qty" "5"

# --- a second customer cannot touch the first cart -----------------------
LOGIN2="$(curl -s -c "$COOKIE2" -X POST "$APP_URL/api/auth" -H 'Content-Type: application/json' -d '{"type":"customer-sign-in"}')"
CART2="$(printf '%s' "$LOGIN2" | jqr 'data.cart.id')"
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/station-session/finish" -H 'Content-Type: application/json' \
  -d "{\"cart_id\":\"$CART\"}")"
check "foreign finish -> 403" "$code" "403"

# --- second Start on a busy counter -> 409 ------------------------------
code="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE2" -X POST \
  "$APP_URL/api/protected/station-session" -H 'Content-Type: application/json' \
  -d "{\"station_id\":\"$STATION\",\"cart_id\":\"$CART2\"}")"
check "busy counter -> 409" "$code" "409"

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
check "stock deducted" "$stock" "95"

# --- a sync after Finish -> 409 -----------------------------------------
code="$(pos_sync "$REF" "[{\"class_name\":\"$CLASS\",\"quantity\":1}]")"
check "post-finish sync -> 409" "$code" "409"

echo
echo "PASS=$PASS FAIL=$FAIL"
[[ "$FAIL" -eq 0 ]]
