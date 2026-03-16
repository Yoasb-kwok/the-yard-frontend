#!/bin/bash
# Export local studio_backend data and upload + import to server
# Run this when your local MySQL is running (e.g. brew services start mysql)

set -e
DB_NAME="${1:-studio_backend}"
DUMP_FILE="${2:-$HOME/Desktop/studio_backend_data.sql}"
PEM="${PEM:-$HOME/Desktop/pem/theyard.pem}"
SERVER="${SERVER:-ubuntu@18.139.86.39}"

echo "Dumping $DB_NAME (data only) to $DUMP_FILE ..."
mysqldump -u root -p'Theyard2026!' --no-create-info --single-transaction "$DB_NAME" > "$DUMP_FILE" 2>/dev/null || \
mysqldump -u root -p --no-create-info --single-transaction "$DB_NAME" > "$DUMP_FILE"

echo "Uploading to server ..."
scp -i "$PEM" "$DUMP_FILE" "$SERVER:~/studio_backend_data.sql"

echo "Importing on server ..."
ssh -i "$PEM" "$SERVER" "mysql -u root -p'Theyard2026!' studio_backend < ~/studio_backend_data.sql && echo 'Import OK'"

echo "Done. You can remove the dump: rm $DUMP_FILE"
