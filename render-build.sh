#!/usr/bin/env bash

apt-get update
apt-get install -y libcairo2 libcairo2-dev libpango1.0-0 libpangocairo-1.0-0 libjpeg62-turbo libjpeg62-turbo-dev libgif-dev librsvg2-dev

# Exit on error
set -o errexit

echo "📦 Installing system dependencies for canvas..."
apt-get update
apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev

echo "📦 Installing npm packages..."
npm ci

echo "✅ Build complete!"
