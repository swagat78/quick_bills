# 🚀 QuickBills Deployment Guide

This guide outlines the steps to deploy the QuickBills platform (Frontend + Backend) to production.

## 1. Backend Deployment (Render / Railway)

The backend is a Node.js/Express server. **Render** is recommended for its ease of use.

### Steps for Render:
1.  **Connect GitHub**: Log in to [Render](https://render.com/) and connect your repository.
2.  **Create a New Web Service**:
    *   **Runtime**: Node
    *   **Build Command**: `cd server && npm install`
    *   **Start Command**: `cd server && node index.js`
3.  **Configure Environment Variables**:
    Go to the **Environment** tab and add:
    *   `SUPABASE_URL`: (From Supabase project settings)
    *   `SUPABASE_ANON_KEY`: (From Supabase project settings)
    *   `GEMINI_API_KEY`: (From Google AI Studio)
4.  **CORS Update**: 
    Once deployed, you will get a URL (e.g., `https://quick-bills-api.onrender.com`). You **must** update your backend CORS setting in `server/index.js` to allow your frontend's production URL.

---

## 2. Frontend Deployment (Vercel / Netlify)

The frontend is a React app built with Parcel. **Vercel** is highly recommended for React apps.

### Steps for Vercel:
1.  **Connect GitHub**: Log in to [Vercel](https://vercel.com/) and import your repository.
2.  **Configure Project**:
    *   **Framework Preset**: Other (or Parcel if detected)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
3.  **Add Environment Variables**:
    *   `SUPABASE_URL`: (Same as backend)
    *   `SUPABASE_ANON_KEY`: (Same as backend)
    *   `REACT_APP_API_URL`: Set this to your **deployed backend URL** (e.g., `https://quick-bills-api.onrender.com`).
4.  **Deploy**: Click deploy. You will get a production URL (e.g., `https://quick-bills.vercel.app`).

---

## 3. Important Production Fixes

### Update Frontend API Calls:
Ensure your frontend components aren't hardcoded to `localhost:3001`. Use an environment variable:
```javascript
// Example in useSecureInvoice.js or similar
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
```

### Update Backend CORS:
In `server/index.js`, update the CORS middleware to include your Vercel URL:
```javascript
app.use(cors({ origin: ["http://localhost:1234", "https://quick-bills.vercel.app"] }));
```

---

## 4. Database Setup (Supabase)

Ensure your Supabase tables are ready:
1.  **Invoices Table**: Columns for `user_id`, `invoice_number`, `line_items` (jsonb), `total`, etc.
2.  **Profiles Table**: Columns for `id` (references auth.users), `currency`, `name`, etc.
3.  **RLS Policies**: Enable Row Level Security (RLS) so users can only read/write their own invoices.

---

## ✅ Deployment Checklist
- [ ] Backend is running and environment variables are set.
- [ ] Frontend `REACT_APP_API_URL` points to the live backend.
- [ ] Backend CORS allows the live frontend domain.
- [ ] Supabase RLS policies are active for security.
