#!/bin/bash

# Health Check Script for AWS EC2 Deployment
# Usage: ./health-check.sh

EC2_IP="43.205.255.217"
API_URL="http://$EC2_IP"

echo "🏥 Health Check for Infinity Angles Backend"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    if curl -s -f "$endpoint" > /dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed${NC}"
        return 1
    fi
}

check_endpoint_with_response() {
    local endpoint=$1
    local description=$2
    
    echo "Checking $description..."
    echo "URL: $endpoint"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}\nRESPONSE_TIME:%{time_total}s" "$endpoint")
    
    if echo "$response" | grep -q "HTTP_CODE:200"; then
        echo -e "${GREEN}✅ Status: OK${NC}"
        echo "$response" | head -5
    else
        echo -e "${RED}❌ Status: Failed${NC}"
        echo "$response"
    fi
    echo ""
}

# Basic connectivity check
echo "1. Testing basic connectivity..."
if ping -c 1 -W 3 "$EC2_IP" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is reachable${NC}"
else
    echo -e "${RED}❌ Server is not reachable${NC}"
    exit 1
fi

# Check main endpoints
echo ""
echo "2. Checking API endpoints..."
check_endpoint_with_response "$API_URL/health" "Health Endpoint"
check_endpoint "$API_URL/api" "API Base"
check_endpoint "$API_URL/api/auth" "Auth Endpoint"
check_endpoint "$API_URL/api/posts" "Posts Endpoint"

# Check if uploads directory is accessible
echo "3. Checking static file serving..."
check_endpoint "$API_URL/uploads/" "Uploads Directory"

echo ""
echo "4. Testing with sample API call..."
health_response=$(curl -s "$API_URL/health")
if echo "$health_response" | grep -q "OK"; then
    echo -e "${GREEN}✅ API is responding correctly${NC}"
    echo "Sample response: $health_response"
else
    echo -e "${RED}❌ API is not responding correctly${NC}"
    echo "Response: $health_response"
fi

echo ""
echo "=========================================="
echo "🏁 Health check completed"
echo "📱 Use this URL in your mobile app: $API_URL/api"
