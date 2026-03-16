# Export database (data only) - run in Terminal on your Mac

# Replace YOUR_MYSQL_PASSWORD with your actual MySQL root password.
# If your database name is different, change studio_backend.

mysqldump -h 127.0.0.1 -u root -p'YOUR_MYSQL_PASSWORD' \
  --no-create-info \
  --single-transaction \
  --skip-extended-insert \
  studio_backend \
  > studio_backend_data.sql

# File will be created in whatever folder you're in. To put it in the frontend project:
# cd /Users/01tech/Desktop/Jason/the-yard-frontend
# then run the mysqldump command above (with the backslash line continuation as one command, or all on one line).
