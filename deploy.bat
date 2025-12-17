@echo off
cd /d C:\laragon\www\project

git pull origin main

composer install --no-dev -o

npm install
npm run build

php artisan migrate --force
php artisan optimize

echo Deployment finished