#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check required variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "Error: Missing required environment variables"
    echo "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env.local"
    exit 1
fi

echo "Setting up test accounts for ReplyGuy..."
echo ""

# Create test accounts via Supabase HTTP API
create_test_user() {
    local email=$1
    local password=$2
    local plan_id=$3
    local display_name=$4
    
    echo "Creating test account: $email (Plan: $plan_id)"
    
    # Create user via Supabase Auth Admin API
    curl -s -X POST \
        "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users" \
        -H "apikey: ${SUPABASE_SERVICE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"email_confirm\": true,
            \"user_metadata\": {
                \"display_name\": \"$display_name\"
            }
        }" > /tmp/user_response.json
    
    # Extract user ID
    user_id=$(cat /tmp/user_response.json | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$user_id" ]; then
        echo "  ❌ Failed to create auth user (may already exist)"
        # Try to get existing user
        email_encoded=$(echo -n "$email" | jq -sRr @uri)
        curl -s -X GET \
            "${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?filter=email.eq.$email_encoded" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" > /tmp/users_response.json
        
        user_id=$(cat /tmp/users_response.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    fi
    
    if [ -n "$user_id" ]; then
        echo "  ✓ User ID: $user_id"
        
        # Create user record
        curl -s -X POST \
            "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "{
                \"id\": \"$user_id\",
                \"email\": \"$email\",
                \"daily_goal\": 10,
                \"timezone\": \"America/New_York\"
            }" > /dev/null
        
        # Create subscription
        curl -s -X POST \
            "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subscriptions" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "{
                \"user_id\": \"$user_id\",
                \"plan_id\": \"$plan_id\",
                \"status\": \"active\",
                \"stripe_customer_id\": \"cus_test_${plan_id}_${user_id:0:8}\",
                \"stripe_subscription_id\": \"sub_test_${plan_id}_${user_id:0:8}\",
                \"current_period_start\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                \"current_period_end\": \"$(date -u -d '+30 days' +%Y-%m-%dT%H:%M:%SZ)\"
            }" > /dev/null
        
        # Initialize usage
        curl -s -X POST \
            "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_usage" \
            -H "apikey: ${SUPABASE_SERVICE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
            -H "Content-Type: application/json" \
            -H "Prefer: resolution=merge-duplicates" \
            -d "{
                \"user_id\": \"$user_id\",
                \"reply_count\": 0,
                \"meme_count\": 0,
                \"suggestion_count\": 0
            }" > /dev/null
        
        echo "  ✅ Test account created successfully!"
        echo "     Email: $email"
        echo "     Password: $password"
        echo ""
    else
        echo "  ❌ Failed to create or find user"
        echo ""
    fi
    
    rm -f /tmp/user_response.json /tmp/users_response.json
}

# Create test accounts
create_test_user "test-free@replyguy.com" "TestFree123!" "free" "Test Free User"
create_test_user "test-basic@replyguy.com" "TestBasic123!" "basic" "Test Basic User"
create_test_user "test-pro@replyguy.com" "TestPro123!" "pro" "Test Pro User"
create_test_user "test-business@replyguy.com" "TestBusiness123!" "business" "Test Business User"

echo "✨ Test account setup complete!"
echo ""
echo "Test Accounts Summary:"
echo "====================="
echo ""
echo "Free Plan:"
echo "  Email: test-free@replyguy.com"
echo "  Password: TestFree123!"
echo "  Limits: 10 replies/month, 0 memes, 0 suggestions"
echo ""
echo "X Basic Plan ($19/month):"
echo "  Email: test-basic@replyguy.com"
echo "  Password: TestBasic123!"
echo "  Limits: 300 replies/month, 10 memes, 50 suggestions"
echo ""
echo "X Pro Plan ($49/month):"
echo "  Email: test-pro@replyguy.com"
echo "  Password: TestPro123!"
echo "  Limits: 500 replies/month, 50 memes, 100 suggestions"
echo "  Features: Write Like Me™"
echo ""
echo "X Business Plan ($99/month):"
echo "  Email: test-business@replyguy.com"
echo "  Password: TestBusiness123!"
echo "  Limits: 1000 replies/month, 100 memes, 200 suggestions"
echo "  Features: Write Like Me™, Priority Support"