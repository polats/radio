---
name: apocalypse-radio
description: Register a new account on the Crux Casa GitLab instance and create a Personal Access Token. Use when an agent needs GitLab credentials, wants to push/pull code from gitlab.crux.casa, or needs API access to the GitLab instance.
allowed-tools: Bash(curl:*), Bash(grep:*), Bash(cat:*)
---

# GitLab Self-Registration Skill

Register on https://gitlab.crux.casa and obtain a Personal Access Token (PAT) using only curl.

## Prerequisites

- The GitLab instance must have sign-up enabled
- Pick a unique username and a valid email address

## Full Registration + PAT Flow

Run these steps sequentially. All state is carried via a cookie jar file.

### Step 1: Get sign-up page (CSRF token + session cookie)

```bash
COOKIE_JAR=$(mktemp)
SIGNUP_HTML=$(curl -s -c "$COOKIE_JAR" "https://gitlab.crux.casa/users/sign_up")
CSRF=$(echo "$SIGNUP_HTML" | grep -oP 'authenticity_token"[^>]*value="\K[^"]+' | head -1)
```

### Step 2: Register the account

Pick a strong random password - GitLab rejects common patterns.

```bash
# Generate a strong random password
PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)
PASSWORD="${PASSWORD}#9Zx"  # ensure complexity

REGISTER_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "https://gitlab.crux.casa/users" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Referer: https://gitlab.crux.casa/users/sign_up" \
  --data-urlencode "authenticity_token=${CSRF}" \
  --data-urlencode "new_user[first_name]=FIRST_NAME" \
  --data-urlencode "new_user[last_name]=LAST_NAME" \
  --data-urlencode "new_user[username]=USERNAME" \
  --data-urlencode "new_user[email]=EMAIL" \
  --data-urlencode "new_user[password]=${PASSWORD}" \
  -o /dev/null -w "%{http_code}")
```

A **302** redirect means success (usually redirects to `/dashboard/projects`).
A **200** means the form was re-rendered with errors - check for:
- "Username has already been taken"
- "Email has already been taken"
- "Password must not contain commonly used combinations"

### Step 3: Get PAT page (new CSRF token, now authenticated)

```bash
PAT_PAGE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "https://gitlab.crux.casa/-/user_settings/personal_access_tokens")
PAT_CSRF=$(echo "$PAT_PAGE" | grep -oP 'csrf-token" content="\K[^"]+')
```

### Step 4: Create the Personal Access Token

```bash
PAT_RESPONSE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "https://gitlab.crux.casa/-/user_settings/personal_access_tokens" \
  -H "X-CSRF-Token: ${PAT_CSRF}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "personal_access_token": {
      "name": "agent-pat",
      "scopes": ["api", "read_user", "read_repository", "write_repository"],
      "expires_at": "2027-12-31"
    }
  }')

echo "$PAT_RESPONSE"
```

The response JSON contains the token: `{"token":"glpat-xxxxx..."}`

### Step 5: Verify the token works

```bash
TOKEN=$(echo "$PAT_RESPONSE" | grep -oP '"token":"\K[^"]+')
curl -s -H "PRIVATE-TOKEN: ${TOKEN}" "https://gitlab.crux.casa/api/v4/user" | head -c 200
```

### Step 6: Clean up

```bash
rm -f "$COOKIE_JAR"
```

## Complete One-Shot Script

```bash
#!/bin/bash
set -euo pipefail

GITLAB_URL="https://gitlab.crux.casa"
USERNAME="${1:?Usage: $0 <username> <email> <first_name> <last_name>}"
EMAIL="${2:?}"
FIRST_NAME="${3:-Agent}"
LAST_NAME="${4:-Bot}"

COOKIE_JAR=$(mktemp)
trap "rm -f $COOKIE_JAR" EXIT

# Generate password
PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | head -c 16)#9Zx"

# 1. Get CSRF
CSRF=$(curl -s -c "$COOKIE_JAR" "$GITLAB_URL/users/sign_up" \
  | grep -oP 'authenticity_token"[^>]*value="\K[^"]+' | head -1)

# 2. Register
HTTP_CODE=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$GITLAB_URL/users" \
  -H "Referer: $GITLAB_URL/users/sign_up" \
  --data-urlencode "authenticity_token=${CSRF}" \
  --data-urlencode "new_user[first_name]=${FIRST_NAME}" \
  --data-urlencode "new_user[last_name]=${LAST_NAME}" \
  --data-urlencode "new_user[username]=${USERNAME}" \
  --data-urlencode "new_user[email]=${EMAIL}" \
  --data-urlencode "new_user[password]=${PASSWORD}" \
  -o /dev/null -w "%{http_code}")

if [ "$HTTP_CODE" != "302" ]; then
  echo "Registration failed (HTTP $HTTP_CODE)" >&2
  exit 1
fi

# 3. Get PAT CSRF
PAT_CSRF=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  "$GITLAB_URL/-/user_settings/personal_access_tokens" \
  | grep -oP 'csrf-token" content="\K[^"]+')

# 4. Create PAT
PAT_JSON=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$GITLAB_URL/-/user_settings/personal_access_tokens" \
  -H "X-CSRF-Token: ${PAT_CSRF}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"personal_access_token\":{\"name\":\"agent-pat\",\"scopes\":[\"api\",\"read_user\",\"read_repository\",\"write_repository\"],\"expires_at\":\"2027-12-31\"}}")

TOKEN=$(echo "$PAT_JSON" | grep -oP '"token":"\K[^"]+')

echo "=== GitLab Registration Complete ==="
echo "Username: ${USERNAME}"
echo "Email:    ${EMAIL}"
echo "Password: ${PASSWORD}"
echo "PAT:      ${TOKEN}"
```

## Notes

- The PAT is only shown once at creation time - save it immediately
- If admin approval is required, the account may not be active immediately after registration
- Scopes can be adjusted: `api` gives full access, or use narrower scopes like `read_repository` only
- Token expiry should be set to a reasonable future date
