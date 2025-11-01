#!/bin/bash
###
# Update Streamed.m3u8 Playlist
#
# Exports streamed sports channels to playlists/Streamed.m3u8
# Run this after your Puppeteer scraper updates the database
###

DB_PATH="/volume1/docker/daddylive/data/viewers.db"
OUTPUT_FILE="./playlists/Streamed.m3u8"

echo "📦 Updating Streamed.m3u8 playlist..."

# Start M3U8 file
echo "#EXTM3U" > "$OUTPUT_FILE"

# Get streamed channels and format as M3U8
sqlite3 "$DB_PATH" "
    SELECT name, logo, group_title, stream_url, tvg_id
    FROM channels
    WHERE source = 'streamed' AND enabled = 1
    ORDER BY group_title, name;
" | while IFS='|' read -r name logo group_title stream_url tvg_id; do
    # Extract raw URL from proxy if needed
    if [[ "$stream_url" =~ drewlive24\.duckdns\.org:4123 ]]; then
        # Extract the url parameter and decode
        raw_url=$(echo "$stream_url" | grep -oP 'url=\K[^&]+' | python3 -c "import sys, urllib.parse as ul; print(ul.unquote_plus(sys.stdin.read()))")
    else
        raw_url="$stream_url"
    fi

    echo "#EXTINF:-1 tvg-id=\"$tvg_id\" tvg-logo=\"$logo\" group-title=\"$group_title\",$name" >> "$OUTPUT_FILE"
    echo "$raw_url" >> "$OUTPUT_FILE"
done

# Count channels
channel_count=$(grep -c "^http" "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo "✅ Streamed.m3u8 updated: $channel_count channels"
echo ""
echo "📍 File location: $OUTPUT_FILE"
