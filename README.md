# 🏠 RoomSplit – Smart Roommate Expense Manager

RoomSplit is a modern full-stack web application designed to simplify expense tracking and financial management for roommates.
It centralises shared expenses, debt settlements, budgeting, chores, and communication — all in one intelligent platform.

---

## 🚀 Live Demo

> [https://roomsplit.app](https://roomsplit.app)


---

## ✨ Features

### 💸 Expense Management

* Add, edit, and delete shared expenses
* Categorise expenses with notes
* Attach bill photos
* Monthly soft-close option

### 🤖 Smart OCR Receipt Scanning

* AI-powered receipt parsing
* Automatically extracts amount, date, and merchant
* Powered by Abacus.AI

### 🔁 Recurring Expenses

* Automatically generate rent, utilities, and subscriptions
* Monthly automation support

### 💰 Debt & Settlement System

* Real-time balance tracking
* Record settlements
* Optional simplified debt algorithm (Splitwise-style optimisation)

### 📊 Interactive Dashboard

* Real-time financial overview
* Recent activity tracking
* Clean UI built with Shadcn/ui

### 📈 Data Visualisation

* Spending by category
* Member-wise analysis
* Monthly trends

### 🛒 Shared Shopping List

* Collaborative grocery list
* Real-time updates

### 🥦 Smart Grocery Prediction

* Predicts when common items may run out

### 🧹 Chore Management

* Assign recurring chores
* Track completion
* Fair distribution system

### 🗣 House Voice (Anonymous Feedback)

* Anonymous communication channel
* Promote healthy roommate discussions

### 🔐 Admin Panel

* Invite-code-based user system
* Manage group settings

### 📤 Data Export

* Export expense history to CSV or PDF

### 🔔 Push Notifications

* Real-time alerts for expenses & settlements

---

## 🏗 Architecture Overview

RoomSplit uses a modern full-stack architecture built around Next.js.

### Frontend

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS
* Shadcn/ui
* Recharts
* Framer Motion

### Backend

* Next.js API Routes
* Prisma ORM
* PostgreSQL

### Services

* Abacus.AI – OCR receipt scanning
* AWS S3 – Bill photo storage

---

## 🛠 Tech Stack

| Layer      | Technology   |
| ---------- | ------------ |
| Framework  | Next.js      |
| Language   | TypeScript   |
| Styling    | Tailwind CSS |
| UI Library | Shadcn/ui    |
| Database   | PostgreSQL   |
| ORM        | Prisma       |
| Storage    | AWS S3       |
| AI Service | Abacus.AI    |

---

## 📦 Getting Started (Local Development)

### Prerequisites

* Node.js (v18+)
* Yarn
* PostgreSQL database

---

### 1️⃣ Clone Repository

```bash
git clone https://github.com/sidddharthhahir/roomsplit.git
cd roomsplit
```

---

### 2️⃣ Install Dependencies

```bash
yarn install
```

---

### 3️⃣ Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
AWS_PROFILE="your-aws-profile"
AWS_REGION="your-aws-region"
AWS_BUCKET_NAME="your-s3-bucket-name"
AWS_FOLDER_PREFIX="your-s3-folder-prefix/"
ABACUSAI_API_KEY="your-abacusai-api-key"
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
```

⚠ Never commit your `.env` file.

---

### 4️⃣ Setup Database

Push schema:

```bash
npx prisma db push
```

Optional seed:

```bash
npx prisma db seed
```

---

### 5️⃣ Run Development Server

```bash
yarn dev
```

Open:

```
http://localhost:3000
```

---

## 📂 Project Structure

```
app/                  # Next.js App Router
  ├── api/            # API routes
  ├── (main)/         # Main application routes
  ├── layout.tsx
components/           # React components
  ├── sections/
  ├── ui/
lib/                  # Utilities & hooks
prisma/               # Database schema
public/               # Static assets
scripts/              # Seed scripts
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your branch

   ```
   git checkout -b feature/AmazingFeature
   ```
3. Commit changes

   ```
   git commit -m "Add AmazingFeature"
   ```
4. Push branch

   ```
   git push origin feature/AmazingFeature
   ```
5. Open Pull Request

---

## 📜 License

Distributed under the MIT License.

---

## 👨‍💻 Author

Siddharth 
GitHub: [https://github.com/sidddharthhahir](https://github.com/sidddharthhahir)

---
