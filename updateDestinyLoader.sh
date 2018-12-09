#!/bin/sh

# This script can be used to upgrade/compile to the latest version
# Please not that all modifications on the original files are lost (but not your conf>. files)

echo "Updating to server revision..."
git fetch --all
git reset --hard origin/master

echo "Building backend"
cd DestinyLoaderBackend
npm install
tsc -p ./src

sudo systemctl daemon-reload

echo "Restarting backend"
sudo service destinyloader stop
sudo service destinyloader start
sleep 5
sudo service destinyserver stop
sudo service destinyserver start

echo "Building frontend"
cd ../DestinyLoaderFrontend
npm install
npm run-script build


cd ..
