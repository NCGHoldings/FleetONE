#!/bin/bash
set -e

APP_DIR="/var/www/ncg-fleetflow"
REPO_URL="https://github.com/globallyceum25-dot/ncg-fleetflow-63495399.git"

# Create app directory
mkdir -p $APP_DIR

# Clone or Pull
if [ -d "$APP_DIR/.git" ]; then
    echo "Pulling latest changes..."
    cd $APP_DIR
    git pull
else
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Install dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps
npm install react-is --legacy-peer-deps

# Build
echo "Building application..."
npm run build

# Setup Nginx
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/ncg-fleetflow <<EOF
server {
    listen 80;
    server_name _;

    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/ncg-fleetflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and Reload Nginx
nginx -t
systemctl reload nginx

echo "Deployment complete! App should be accessible at http://$(curl -s ifconfig.me)"
