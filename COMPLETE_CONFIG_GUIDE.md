# 🎬 CineBook Complete Configuration Guide

## 🚀 Quick Setup Overview

### **Step 1: Backend Deployment (Vercel)**
### **Step 2: Frontend Deployment (Vercel)**  
### **Step 3: Database & External Services**
### **Step 4: Environment Variables**
### **Step 5: Testing & Verification**

---

## 📋 **STEP 1: Backend Deployment (Vercel)**

### **1.1 Deploy Backend to Vercel**
```bash
cd server
vercel --prod
```

### **1.2 Set Environment Variables in Vercel Dashboard**
Go to your Vercel project → Settings → Environment Variables:

```env
NODE_ENV=production
PORT=8000

# Database
MONGO_URI=mongodb+srv://developed848:r8svIM3fDRlY0dug@cluster0.vd8bep7.mongodb.net/cinebook

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_make_it_long_and_random_for_production

# Razorpay
RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
RAZORPAY_KEY_SECRET=rzp_test_your_actual_key_secret
RAZORPAY_MODE=test

# Email
EMAIL_USER=developed848@gmail.com
EMAIL_PASS=developed1234567
SKIP_EMAIL_ON_DEV=false
SKIP_OTP_IN_DEV=false

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://your-frontend-name.vercel.app
```

### **1.3 Your Backend URL**
After deployment: `https://cinebook-6ys5.vercel.app`

---

## 🌐 **STEP 2: Frontend Deployment (Vercel)**

### **2.1 Update Frontend Environment**
Update `client/.env.production`:
```env
# Backend API URL
VITE_API_URL=https://cinebook-6ys5.vercel.app

# Razorpay (same as backend)
VITE_RAZORPAY_KEY_ID=rzp_test_your_actual_key_id

# Production Settings
VITE_SKIP_RAZORPAY=false
VITE_FORCE_MOCK_PAYMENT=false
```

### **2.2 Deploy Frontend to Vercel**
```bash
cd client
vercel --prod
```

### **2.3 Update Backend CORS**
After frontend deployment, update backend environment variable:
```env
FRONTEND_URL=https://your-actual-frontend-url.vercel.app
```

---

## 🗄️ **STEP 3: Database & External Services**

### **3.1 MongoDB Atlas (Already Configured)**
✅ **Current Database**: `mongodb+srv://developed848:r8svIM3fDRlY0dug@cluster0.vd8bep7.mongodb.net/cinebook`

### **3.2 Gmail App Password**
1. Enable 2-factor authentication on Gmail
2. Go to Google Account → Security → App passwords
3. Generate 16-digit app password
4. Replace `developed1234567` with actual app password

### **3.3 Razorpay Setup**
1. Go to [razorpay.com](https://razorpay.com)
2. Create account → Get test keys
3. Replace `rzp_test_your_actual_key_id` with real test key
4. Use same key in both backend and frontend

### **3.4 Cloudinary Setup**
1. Go to [cloudinary.com](https://cloudinary.com)
2. Create free account
3. Get API credentials from dashboard
4. Update environment variables

---

## ⚙️ **STEP 4: Current Configuration Status**

### **✅ Ready Files:**
- `server/vercel.json` - Backend Vercel config
- `client/.env.production` - Frontend production config
- `server/.env.production` - Backend production config
- `server/server.js` - CORS configured for Vercel

### **🔧 Environment Variables:**
```bash
# Backend (Vercel Dashboard)
NODE_ENV=production
MONGO_URI=mongodb+srv://developed848:r8svIM3fDRlY0dug@cluster0.vd8bep7.mongodb.net/cinebook
JWT_SECRET=your_super_secret_jwt_key_make_it_long_and_random_for_production
FRONTEND_URL=https://your-frontend-url.vercel.app

# Frontend (.env.production)
VITE_API_URL=https://cinebook-6ys5.vercel.app
```

---

## 🧪 **STEP 5: Testing & Verification**

### **5.1 Test Backend API**
```bash
# Health check
curl https://cinebook-6ys5.vercel.app

# Movies API
curl https://cinebook-6ys5.vercel.app/api/movie/movies

# Admin login
curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@cinebook.com","password":"admin123"}' \
  https://cinebook-6ys5.vercel.app/api/admin/login
```

### **5.2 Test Frontend**
1. Visit your frontend URL
2. Test login with: `admin@cinebook.com` / `admin123`
3. Check movie browsing
4. Test booking flow

### **5.3 Seed Database (If Needed)**
```bash
# Run locally to seed production database
cd server
npm run seed-users
npm run seed
```

---

## 🚨 **Troubleshooting**

### **CORS Errors:**
- Ensure `FRONTEND_URL` in backend matches frontend URL exactly
- Redeploy backend after updating FRONTEND_URL

### **API Not Found:**
- Check backend deployment logs in Vercel
- Verify `VITE_API_URL` in frontend

### **Database Connection:**
- Verify MongoDB Atlas allows connections from `0.0.0.0/0`
- Check connection string format

### **Login Issues:**
- Run seed scripts to create admin users
- Check JWT_SECRET is set in backend

---

## 📱 **Expected URLs After Deployment:**

- **Backend**: `https://cinebook-6ys5.vercel.app`
- **Frontend**: `https://your-frontend-name.vercel.app`
- **Admin Panel**: `https://your-frontend-name.vercel.app/admin`

---

## 🎯 **Quick Deployment Commands:**

```bash
# Deploy Backend
cd server && vercel --prod

# Deploy Frontend  
cd client && vercel --prod

# Seed Database (run locally)
cd server && npm run seed-all
```

**Your CineBook application is now ready for production! 🚀**