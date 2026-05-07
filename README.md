# PrimeDraft.AI

<p align="left">
  <img src="public/brand/primedraft-logo.svg" width="360" alt="PrimeDraft Logo" />
</p>

PrimeDraft.AI is a role-based design workflow platform with:

- OTP auth and role handling (`normal`, `freelancer`, `factory`)
- Project creation and editor flow
- Local curated editor assets (templates, fonts, stock images)
- Billing/download access checks

## Quick Start

```bash
composer run setup
composer test
npm run test:frontend
composer dev
```

## Demo Seed Data

Run:

```bash
php artisan db:seed
```

Seeders create role demo users and supporting records for dashboards/pages.
