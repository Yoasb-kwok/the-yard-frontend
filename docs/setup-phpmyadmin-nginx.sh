#!/bin/bash
# Run this ON THE UBUNTU SERVER (after SSH). Fixes duplicate default_server and configures phpMyAdmin.
# Usage: bash setup-phpmyadmin-nginx.sh

set -e

# 1. Symlink phpMyAdmin
sudo ln -sf /usr/share/phpmyadmin /var/www/html/phpmyadmin

# 2. Create phpMyAdmin config WITHOUT default_server (avoids conflict with sites-enabled/default)
# Use PHP 8.3 FPM socket
sudo tee /etc/nginx/conf.d/phpmyadmin.conf > /dev/null <<'NGINX_EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html index.php;

    location / {
        try_files $uri $uri/ =404;
    }

    location /phpmyadmin {
        alias /usr/share/phpmyadmin;
        index index.php;
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
        }
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
    }
}
NGINX_EOF

# 3. Test and reload Nginx
sudo nginx -t && sudo systemctl reload nginx

# 4. Restart PHP-FPM
sudo systemctl restart php8.3-fpm

echo "Done. Open http://YOUR_SERVER_IP/phpmyadmin and log in with root / Theyard2026!"
