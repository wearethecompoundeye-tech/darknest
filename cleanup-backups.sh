#!/bin/bash
# cleanup-backups.sh - Remove all .bak* files from the repository

echo "🧹 Cleaning up backup files..."

# Find and remove all backup files
BACKUP_COUNT=$(find . -name "*.bak*" -type f | wc -l)

if [ "$BACKUP_COUNT" -gt 0 ]; then
  echo "Found $BACKUP_COUNT backup files to remove..."
  find . -name "*.bak*" -type f -delete
  echo "✅ Backup files removed successfully!"
  
  # Stage the deletion in git
  git add -u
  echo "✅ Staged file deletions in git"
  
  echo ""
  echo "📝 Next steps:"
  echo "1. Review changes: git status"
  echo "2. Commit deletion: git commit -m 'chore: remove backup files'"
  echo "3. Push changes: git push"
else
  echo "✨ No backup files found - repository is clean!"
fi
