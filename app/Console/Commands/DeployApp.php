<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DeployApp extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:deploy-app';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deploy application (Windows)';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $root = base_path();
        $output = shell_exec("cd $root && git pull origin main && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache");
        $this->info($output);
    }
}
