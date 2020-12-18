#!/bin/bash

git fetch
git pull
npm install
npm run build
cp dist/haha-stream /usr/local/nginx/html
