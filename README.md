# 🛠️ QuickBills: Industrial Minimalist Invoice Engine

QuickBills is a high-performance, production-ready SaaS platform designed for the modern business. Featuring an **Industrial Minimalist** aesthetic, it combines lightning-fast invoice generation with enterprise-grade features like AI-powered auto-fill and professional GST management.

![QuickBills Header](https://via.placeholder.com/1200x400/020617/3b82f6?text=QuickBills:+Industrial+Minimalist+Invoicing)

## 🚀 Key Features

- **Industrial Aesthetic**: A high-end, permanent Dark Mode interface built on a tiered slate palette (`slate-950` / `slate-900`) for maximum visual depth and professional feel.
- **AI-Powered Auto-Fill**: Streamline your workflow with an AI prompt bar that extracts line items and client details from natural language.
- **Comprehensive GST Support**: Built-in logic for Intra-State (CGST + SGST) and Inter-State (IGST) taxation, compliant with modern regulatory standards.
- **Secure Auth & Profiles**: Robust user management powered by **Supabase Auth**, including customizable profile settings and default currency persistence.
- **Sticky Workspace**: An optimized editing experience with a pinned action sidebar and fluid vertical scrolling for complex, multi-item invoices.
- **Public Share Links**: Generate professional, read-only public links for your invoices with real-time status watermarks (PAID, OVERDUE, etc.).

## 💻 Tech Stack

- **Frontend**: React 18, Tailwind CSS v3 (Custom Industrial Theme), React-Bootstrap.
- **Backend**: Node.js, Express.
- **Database & Auth**: Supabase (PostgreSQL).
- **Styling**: Vanilla CSS + Tailwind Utility Classes for a hybrid 'Industrial' look.
- **Icons**: Lucide React, React Icons (Bi, Bs).

## 🛠️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/swagat78/quick_bills.git
   cd quick_bills
   ```

2. **Install Dependencies**:
   ```bash
   # Install client dependencies
   npm install
   
   # Install server dependencies
   cd server && npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Application**:
   ```bash
   # From the root directory
   npm start
   
   # In a separate terminal, start the backend
   cd server && node index.js
   ```

## 🏗️ Architecture

QuickBills follows a modular component-based architecture:
- `/src/components`: Reusable UI modules (InvoiceForm, AIPrompt, Dashboard).
- `/src/hooks`: Custom logic hooks for auth, data persistence, and debouncing.
- `/src/utils`: Pure functional utilities for GST calculations and exports.
- `/server`: Lightweight Express backend for secure price validation and data handling.

## 🎨 Design Philosophy

QuickBills is built on the principle of **"Hard Minimalist"** design. We eliminate unnecessary whitespace, use thin professional borders instead of shadows, and maintain a high-contrast dark palette to create a tool that feels less like a website and more like a piece of high-precision software.

---

Built with 💙 by [Swagat](https://github.com/swagat78)