#!/bin/bash
set -e

SERVER_USER="ubuntu"
SERVER_IP="16.4.49.114"
SERVER_DIR="/www/wwwroot/default"

echo "========================================="
echo "🚀 Starting HRMS Production Deployment..."
echo "========================================="

# 1. Push latest changes to GitHub
echo ""
echo "📦 1/4. Ensuring latest local code is pushed to GitHub..."
git push origin main

# 2. Build frontend locally (avoids server memory heap crash)
echo ""
echo "⚡ 2/4. Building Frontend locally..."
npm run build --prefix frontend

# 3. Upload built frontend bundle to server
echo ""
echo "📤 3/4. Uploading compiled Frontend bundle to Server..."
tar -C frontend/dist -czf - . | ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "sudo mkdir -p /www/wwwroot/default/frontend/dist && sudo tar -xzf - -C /www/wwwroot/default/frontend/dist && sudo chown -R www:www /www/wwwroot/default/frontend/dist || true"

# 4. Deploy Backend & Reload Services on Server
echo ""
echo "🌐 4/4. Updating Backend and reloading PM2 on Server..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
  set -e
  export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:$(find /www/server/nodejs -type d -name "bin" 2>/dev/null | tr '\n' ':')

  echo "--> Configuring safe directories..."
  sudo git config --global --add safe.directory "*" || true
  git config --global --add safe.directory "*" || true

  echo "--> Navigating to project directory..."
  cd /www/wwwroot/default
  
  echo "--> Pulling latest backend code from GitHub..."
  sudo git fetch origin main
  sudo git reset --hard origin/main
  
  echo "--> Installing backend dependencies..."
  cd /www/wwwroot/default/backend && sudo env "PATH=$PATH" npm install --production=false
  
  echo "--> Reloading Node.js PM2 backend service..."
  sudo pkill -f "node server.js" || true
  sudo env "PATH=$PATH" pm2 reload all || sudo env "PATH=$PATH" pm2 restart all || true
  
  echo "✅ Server update completed successfully!"
EOF

echo ""
echo "========================================="
echo "🎉 Deployment Finished Successfully!"
echo "👉 Frontend: https://hrms.ifloriana.com"
echo "👉 Backend API: https://hrmsapi.ifloriana.com"
echo "========================================="
