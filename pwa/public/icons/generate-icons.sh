#!/bin/bash
# Generate simple PNG icons from an SVG
DIR="$(cd "$(dirname "$0")" && pwd)"

# Create a simple SVG icon
cat > "$DIR/icon.svg" << 'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#6366f1"/>
  <circle cx="256" cy="220" r="100" fill="none" stroke="white" stroke-width="24"/>
  <line x1="256" y1="220" x2="256" y2="160" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <line x1="256" y1="220" x2="300" y2="220" stroke="white" stroke-width="20" stroke-linecap="round"/>
  <line x1="256" y1="120" x2="256" y2="100" stroke="white" stroke-width="16" stroke-linecap="round"/>
  <circle cx="256" cy="370" r="8" fill="white"/>
  <circle cx="220" cy="370" r="8" fill="white"/>
  <circle cx="292" cy="370" r="8" fill="white"/>
</svg>
SVG
echo "SVG icon created"
