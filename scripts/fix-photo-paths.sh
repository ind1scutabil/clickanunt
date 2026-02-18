#!/bin/bash

# Script to extract photo URLs from database and create necessary directory structure

UPLOADS_DIR="/var/www/clickanunt/public/uploads"

echo "Extracting photo URLs from database..."
URLS=$(PGPASSWORD=autoplat123 psql -h localhost -U autoplat -d autoplat -t -c "SELECT unnest(photos) FROM listings WHERE photos IS NOT NULL;" | grep -v '^$')

echo "Creating directory structures..."
while IFS= read -r url; do
    if [[ $url =~ /uploads/(.+)$ ]]; then
        path="${BASH_REMATCH[1]}"
        fullpath="$UPLOADS_DIR/$path"
        dir=$(dirname "$fullpath")
        
        # Create directory if it doesn't exist
        if [ ! -d "$dir" ]; then
            echo "Creating: $dir"
            mkdir -p "$dir"
        fi
        
        # Check if file exists
        if [ ! -f "$fullpath" ]; then
            filename=$(basename "$path")
            # Try to find file in uploads root by filename pattern
            found=$(find "$UPLOADS_DIR" -maxdepth 1 -type f -name "*$filename" 2>/dev/null | head -1)
            
           if [ -n "$found" ]; then
                echo "Found matching file: $found -> $fullpath"
                cp "$found" "$fullpath"
            else
                # Try to find any file and copy as placeholder
                placeholder=$(find "$UPLOADS_DIR" -maxdepth 1 -type f -name "*.jpeg" -o -name "*.jpg" -o -name "*.png" 2>/dev/null | head -1)
                if [ -n "$placeholder" ]; then
                    echo "Creating placeholder: $fullpath"
                    cp "$placeholder" "$fullpath"
                fi
            fi
        fi
    fi
done <<< "$URLS"

echo "Done! Directory structure created."
