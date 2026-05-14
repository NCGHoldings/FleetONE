module.exports = {
  apps: [
    {
      name:         "fleetone-bug-listener",
      script:       "scripts/bug-listener.mjs",
      cwd:          "/var/www/fleetone/FleetONE",
      interpreter:  "node",
      restart_delay: 5000,   // wait 5s before restart on crash
      max_restarts:  20,
      autorestart:   true,
      watch:         false,
      env: {
        NODE_ENV:          "production",
        REPO_ROOT:         "/var/www/fleetone/FleetONE",
        GITHUB_REPO:       "NCGHoldings/FleetONE",
        SLACK_CHANNEL_ID:  "C0B2XT7EN90",
        BUG_BOT_USER_ID:   "U0B2ZP9PGM7",
        // Secrets injected by deploy workflow via /etc/fleetone-bug-listener.env
      },
    },
  ],
};
