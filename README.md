# Shayona Invoice — Retail & Wholesale Invoice Application

A professional, offline-first mobile invoice and ledger management application built with **React Native (Expo SDK 57)** and **Supabase (PostgreSQL with Row Level Security)**.

---

## 📱 Features

- **Authentication & Security**: Phone/password and Google OAuth authentication with multi-tenant Row Level Security (RLS) data isolation.
- **Dashboard & Financial Overview**: Real-time sales metrics (Total Billed Sales, Jama Received, Baki Pending, Total Bills) with interactive period filtering (Today, This Week, This Month, This Year, Custom Range).
- **Invoice Management**: Create, view, and edit multi-item retail and wholesale bills with automatic invoice numbering (`INV-0001`, `INV-0002`, etc.) and amount calculations.
- **Payment History & Customer/Buyer Ledger**: Granular payment tracking per invoice (Jama/Baki ledger) with date, mode, notes, and strict overpayment protection.
- **Clean Customer-Facing PDF Generation**: High-quality 1-page printable invoices with shop branding, itemized tables, amount in words, and authorized signatory (strictly non-GST, non-accounting).
- **Native Sharing & Printing**: One-tap PDF sharing via WhatsApp, Android share sheet, and direct AirPrint/Android Print.
- **Offline-First Synchronization**: Create invoices and record payments completely offline. Mutations are queued in local partitioned storage and automatically synchronized to Supabase when internet connectivity is restored.
- **Data Backup & Restore**: Structured Version 1 JSON backup export via native share dialog and ownership-safe merge/restore with financial validation.
- **Bilingual Support**: Instant toggle between **English** and **ગુજરાતી (Gujarati)** across all screens, forms, dialogs, and bills.

---

## 🛠 Technology Stack

- **Framework**: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) (React Native 0.86.3, React 19.2.3)
- **Routing**: Expo Router (File-based navigation with typed routes)
- **State Management & Caching**: TanStack React Query v5 + Zustand v5
- **Local Persistence**: Partitioned `@react-native-async-storage/async-storage` + `expo-secure-store`
- **Backend & Database**: Supabase PostgreSQL with strict RLS policies & B-tree performance indexes
- **Form Handling & Validation**: React Hook Form + Zod
- **Document & Media Engine**: `expo-print`, `expo-sharing`, `expo-file-system`

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on Android/iOS (for local development) or Android Studio / physical Android device

### 2. Installation

```bash
# Clone repository
git clone https://github.com/krisvasoya/shayona2.git
cd shayona2

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Note**: Never expose `service_role` keys in client applications. The application operates strictly with the public `anon` key and enforces data isolation via PostgreSQL RLS.

### 4. Supabase Database Setup

Execute the migrations in the `supabase/migrations/` directory in sequential order:

1. `001_initial_schema.sql` — Profiles, Customers, Buyers, Invoices, Items, Storage
2. `002_rls_security_hardening.sql` — Multi-tenant RLS security policies
3. `003_performance_indexes.sql` — B-tree performance indexes for scalable 3+ year history
4. `004_auth_mobile_unique.sql` — Mobile number authentication support
5. `005_payment_history.sql` — Granular payment history audit trail and RLS policies

---

## 📱 Running the Application

### Development Server

```bash
# Start local development server
npm start

# Start with tunnel (for physical device testing over internet)
npx expo start --tunnel
```

---

## 🧪 Testing & Quality Assurance

The application includes an automated test suite covering authentication, validation, multi-user isolation, calculation integrity, offline sync, and edge cases:

```bash
# Run unit & integration tests
npm test

# Typecheck TypeScript definitions
npm run typecheck

# Lint codebase
npm run lint

# Check Prettier formatting
npm run format:check
```

---

## 📦 Android Production Build (EAS)

The project includes an `eas.json` configuration for creating Android standalone packages:

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Log in to Expo
eas login

# 3. Build Preview APK (for direct device installation & testing)
eas build --platform android --profile preview

# 4. Build Production Android App Bundle (.aab for Google Play Store)
eas build --platform android --profile production
```

---

## 🔒 Security Invariants

- **Tenant Isolation**: Every database query is scoped to `auth.uid() = user_id`.
- **Zero Secrets in Client**: The client bundle contains only public URL and anon key.
- **Financial Balance**: $\text{Remaining (Baki)} = \max(0, \text{Total Amount} - \text{Paid Amount (Jama)})$.
- **Customer Privacy**: Customer-facing PDFs strictly exclude internal payment history, Jama, Baki, and GST.
