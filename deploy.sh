#!/bin/bash
set -e

SERVER_USER="ubuntu"
SERVER_IP="16.4.49.114"
SERVER_DIR="/www/wwwroot/default"

echo "========================================="
echo "🚀 Starting HRMS Production Deployment..."
echo "========================================="

# 1. Commit and push any untracked changes
echo ""
echo "📦 1/4. Pushing latest code to GitHub..."
git add .
if ! git diff-index --quiet HEAD --; then
  git commit -m "deploy: update production build $(date '+%Y-%m-%d %H:%M:%S')"
fi
git push origin main

# 2. Build frontend locally (avoids server RAM heap exhaustion)
echo ""
echo "⚡ 2/4. Building Frontend locally (Mac)..."
npm run build --prefix frontend

# 3. Upload built frontend bundle to server
echo ""
echo "📤 3/4. Uploading compiled Frontend bundle to Server..."
tar -C frontend/dist -czf - . | ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "sudo mkdir -p /www/wwwroot/default/frontend/dist && sudo tar -xzf - -C /www/wwwroot/default/frontend/dist && sudo chown -R www:www /www/wwwroot/default/frontend/dist"

# 4. Deploy Backend & Reload Services on Server
echo ""
echo "🌐 4/4. Updating Backend and reloading Services on Server..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
  set -e
  export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:$(find /www/server/nodejs -type d -name "bin" 2>/dev/null | tr '\n' ':')

  echo "--> Configuring safe directories..."
  sudo git config --global --add safe.directory "*" || true
  git config --global --add safe.directory "*" || true

  echo "--> Ensuring server git repository is ready..."
  if [ ! -d "/www/wwwroot/default/.git" ]; then
    sudo git -C /www/wwwroot/default init
    sudo git -C /www/wwwroot/default remote add origin https://github.com/jaimilgorajiya/hrms_main.git || sudo git -C /www/wwwroot/default remote set-url origin https://github.com/jaimilgorajiya/hrms_main.git
  fi

  echo "--> Pulling latest backend code from GitHub..."
  sudo git -C /www/wwwroot/default fetch origin main
  sudo git -C /www/wwwroot/default reset --hard origin/main

  echo "--> Installing backend dependencies..."
  cd /www/wwwroot/default/backend && sudo env "PATH=$PATH" npm install --production=false

  echo "--> Restarting Node.js backend service..."
  sudo pkill -f "node server.js" 2>/dev/null || true
  sleep 1
  if [ -f "/www/server/nodejs/vhost/scripts/backend.sh" ]; then
    sudo bash /www/server/nodejs/vhost/scripts/backend.sh
  else
    nohup /www/server/nodejs/v25.9.0/bin/node /www/wwwroot/default/backend/server.js > /www/wwwlogs/nodejs/backend.log 2>&1 &
  fi

  echo "--> Ensuring file permissions..."
  sudo chown -R www:www /www/wwwroot/default 2>/dev/null || true

  echo "✅ Server update completed successfully!"
EOF

echo ""
echo "========================================="
echo "🎉 Deployment Finished Successfully!"
echo "👉 Frontend: https://hrms.ifloriana.com"
echo "👉 Backend API: https://hrmsapi.ifloriana.com"
echo "========================================="

