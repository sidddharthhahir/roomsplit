# RoomSplit

RoomSplit is a full-stack roommate expense and household management platform.

## Overview

RoomSplit helps shared households manage expenses, settlements, chores, and communication in one place. It combines financial tracking with practical day-to-day collaboration tools.

## Key Features

- Shared expense tracking with categories and notes
- OCR-based receipt parsing for faster entry
- Recurring expenses and monthly automation
- Debt balancing and settlement tracking
- Dashboard analytics and spending visualizations
- Shared shopping list and grocery prediction
- Chore assignment and completion tracking
- Anonymous in-house feedback channel
- Data export and real-time notifications

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **UI/Styling:** React, Tailwind CSS, Shadcn/ui
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Storage:** AWS S3
- **Services:** Abacus.AI (receipt OCR)

## Setup and Run

### Prerequisites

- Node.js 18+
- Yarn
- PostgreSQL

### Installation

```bash
git clone https://github.com/sidddharthhahir/roomsplit.git
cd roomsplit
yarn install
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="******HOST:PORT/DATABASE"
AWS_PROFILE="your-aws-profile"
AWS_REGION="your-aws-region"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_FOLDER_PREFIX="your-s3-folder-prefix/"
ABACUSAI_API_KEY="your-abacusai-api-key"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

### Database Setup

```bash
npx prisma db push
```

Optional seed:

```bash
npx prisma db seed
```

### Start Development Server

```bash
yarn dev
```

## Usage

Open `http://localhost:3000` and:

1. Create or join a roommate group
2. Add expenses and receipts
3. Track balances, chores, and household activity

## Project Structure

```text
app/          # Next.js routes and API
components/   # UI and section components
lib/          # Utilities and hooks
prisma/       # Database schema
public/       # Static assets
scripts/      # Seed and utility scripts
```

## Contributing

Contributions are welcome. Fork the repository, create a feature branch, and open a pull request with a clear description of your changes.

## License and Contact

This project is licensed under the MIT License.  
Maintainer: [@sidddharthhahir](https://github.com/sidddharthhahir)
