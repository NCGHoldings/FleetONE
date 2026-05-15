#!/bin/bash

# FleetONE Backup Encryption Setup Script
# Enables AES-256 encryption, versioning, and object lock on DigitalOcean Spaces
# Date: May 14, 2026

set -e

# Configuration
DO_SPACE_BUCKET="ncg-db-backup"
DO_SPACE_ENDPOINT="https://sgp1.digitaloceanspaces.com"
RETENTION_DAYS=90

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}║        FleetONE Backup Encryption Setup                        ║${NC}"
echo -e "${BLUE}║        DigitalOcean Spaces - AES-256 Encryption               ║${NC}"
echo -e "${BLUE}║                                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if credentials are configured
if ! aws s3 ls --endpoint-url "$DO_SPACE_ENDPOINT" &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured or invalid${NC}"
    echo "Please configure AWS credentials with:"
    echo "  aws configure"
    echo ""
    echo "Use your DigitalOcean Spaces credentials:"
    echo "  Access Key ID: [your-key]"
    echo "  Secret Access Key: [your-secret]"
    echo "  Default region: sgp1"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"
echo ""

# Step 1: Enable AES-256 Encryption
echo -e "${YELLOW}Step 1: Enabling AES-256 Encryption...${NC}"
aws s3api put-bucket-encryption \
  --bucket "$DO_SPACE_BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }' \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AES-256 encryption enabled${NC}"
else
    echo -e "${RED}❌ Failed to enable encryption${NC}"
    exit 1
fi
echo ""

# Step 2: Verify Encryption
echo -e "${YELLOW}Step 2: Verifying Encryption Configuration...${NC}"
ENCRYPTION_CONFIG=$(aws s3api get-bucket-encryption \
  --bucket "$DO_SPACE_BUCKET" \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1)

if echo "$ENCRYPTION_CONFIG" | grep -q "AES256"; then
    echo -e "${GREEN}✅ Encryption verified${NC}"
    echo "$ENCRYPTION_CONFIG" | grep -A 5 "SSEAlgorithm"
else
    echo -e "${RED}❌ Encryption verification failed${NC}"
    exit 1
fi
echo ""

# Step 3: Enable Object Versioning
echo -e "${YELLOW}Step 3: Enabling Object Versioning...${NC}"
aws s3api put-bucket-versioning \
  --bucket "$DO_SPACE_BUCKET" \
  --versioning-configuration Status=Enabled \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Object versioning enabled${NC}"
else
    echo -e "${RED}❌ Failed to enable versioning${NC}"
    exit 1
fi
echo ""

# Step 4: Verify Versioning
echo -e "${YELLOW}Step 4: Verifying Versioning Configuration...${NC}"
VERSIONING_CONFIG=$(aws s3api get-bucket-versioning \
  --bucket "$DO_SPACE_BUCKET" \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1)

if echo "$VERSIONING_CONFIG" | grep -q "Enabled"; then
    echo -e "${GREEN}✅ Versioning verified${NC}"
    echo "$VERSIONING_CONFIG"
else
    echo -e "${RED}❌ Versioning verification failed${NC}"
    exit 1
fi
echo ""

# Step 5: Set Object Lock (GOVERNANCE mode)
echo -e "${YELLOW}Step 5: Setting Object Lock (GOVERNANCE mode, ${RETENTION_DAYS} days)...${NC}"
aws s3api put-object-lock-configuration \
  --bucket "$DO_SPACE_BUCKET" \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": '$RETENTION_DAYS'
      }
    }
  }' \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Object lock configured${NC}"
else
    echo -e "${RED}❌ Failed to configure object lock${NC}"
    exit 1
fi
echo ""

# Step 6: Verify Object Lock
echo -e "${YELLOW}Step 6: Verifying Object Lock Configuration...${NC}"
LOCK_CONFIG=$(aws s3api get-object-lock-configuration \
  --bucket "$DO_SPACE_BUCKET" \
  --endpoint-url "$DO_SPACE_ENDPOINT" 2>&1)

if echo "$LOCK_CONFIG" | grep -q "GOVERNANCE"; then
    echo -e "${GREEN}✅ Object lock verified${NC}"
    echo "$LOCK_CONFIG" | grep -A 10 "ObjectLockConfiguration"
else
    echo -e "${RED}❌ Object lock verification failed${NC}"
    exit 1
fi
echo ""

# Step 7: Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    ENCRYPTION SETUP COMPLETE                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✅ All encryption configurations applied successfully!${NC}"
echo ""
echo "Summary:"
echo "  Bucket:              $DO_SPACE_BUCKET"
echo "  Endpoint:            $DO_SPACE_ENDPOINT"
echo "  Encryption:          AES-256 ✅"
echo "  Versioning:          Enabled ✅"
echo "  Object Lock:         GOVERNANCE mode, $RETENTION_DAYS days ✅"
echo ""
echo "Next Steps:"
echo "  1. Update backup workflow to verify encryption"
echo "  2. Test backup encryption with next scheduled backup"
echo "  3. Monitor backup logs for encryption verification"
echo ""
