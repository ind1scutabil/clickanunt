#!/bin/bash
# Script to remove Turnstile from UI components
# This script performs automated cleanup of Turnstile references

set -e

echo "🧹 Removing Turnstile from UI components..."

# List of files to process
FILES=(
  "app/components/LoginForm.tsx"
  "app/components/SignupFormExtended.tsx"
  "app/components/CreateListingFlow.tsx"
  "app/components/OptimizedListingFlow.tsx"
  "app/components/ReportButton.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Remove Turnstile import
    sed -i '' '/import.*TurnstileWidget/d' "$file"
    
    # Remove turnstileToken state declaration
    sed -i '' '/const \[turnstileToken.*setTurnstileToken\]/d' "$file"
    sed -i '' '/turnstileToken.*useState/d' "$file"
    
    # Remove turnstile enabled check
    sed -i '' '/turnstileEnabled.*TURNSTILE_SITE_KEY/d' "$file"
    
    echo "  ✓ Cleaned $file"
  else
    echo "  ⚠ File not found: $file"
  fi
done

echo ""
echo "✅ Turnstile UI cleanup complete!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Review each .bak file and manually remove:"
echo "   - TurnstileWidget JSX components"
echo "   - turnstileToken from API call bodies"
echo "   - Turnstile validation logic"
echo "2. Test each component"
echo "3. Remove .bak files after verification"
echo ""
echo "Files to manually review:"
for file in "${FILES[@]}"; do
  echo "  - $file"
done
