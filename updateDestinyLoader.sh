#!/bin/sh

# This script can be used to upgrade/compile to the latest version
# Please not that all modifications on the original files are lost (but not your conf>. files)

echo "Updating to server revision..."
git fetch --all
git reset --hard origin/master

echo "Building ..."
npm install

echo "Restarting backend"
sudo service destinyloader stop
sudo service destinyserver stop
sudo service destinyloader start
sudo service destinyserver start

