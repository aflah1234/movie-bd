# Vercel Deployment Guide for CineBook

## 🚀 Backend Deployment (Server)

### Step 1: Deploy Backend to Vercel
1. **Create new Vercel project for backend**:
   ```bash
   cd server
   vercel --prod
   ```

2. **Set Environment Variables in Vercel Dashboard**:
   - Go to your Vercel project settings
   - Add these environment variables:
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://developed848:r8svIM3fDRlY0dug@cluster0.vd8bep7.mongodb.net/cinebook
   JWT_SECRET=your_super_secret_jwt_key_make_it_long_and_random_for_production
   RAZORPAY_KEY_ID=rzp_test_your_actual_key_id
   RAZORPAY_KEY_SECRET=rzp_test_your_actual_key_secret
   EMAIL_USER=developed848@gmail.com
   EMAIL_PASS=developed1234567
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

3. **Your backend will be available at**: `https://your-backend-name.vercel.app`

### Step 2: Update Frontend Configuration
1. **Update client/.env.production** with your backend URL:
   ```
   VITE_API_URL=https://your-backend-name.vercel.app
   ```

## 🌐 Frontend Deployment (Client)

### Step 1: Deploy Frontend to Vercel
1. **Create new Vercel project for frontend**:
   ```bash
   cd client
   vercel --prod
   ```

2. **Vercel will automatically**:
   - Detect it's a Vite project
   - Build using `npm run build`
   - Use production environment variables

### Step 2: Update Backend CORS
1. **Add your frontend URL to server CORS** (already done in server.js)
2. **Update FRONTEND_URL in backend environment variables**

## 🔧 Configuration Files Ready

### ✅ Backend Configuration:
- `server/vercel.json` - Vercel deployment config
- `server/.env.production` - Production environment variables
- `server/server.js` - Updated CORS for Vercel domains

### ✅ Frontend Configuration:
- `client/.env.production` - Production API URL
- `client/vite.config.js` - Build configuration

## 🚀 Deployment Commands

### Backend:
```bash
cd server
vercel --prod
```

### Frontend:
```bash
cd client
vercel --prod
```

## 🔗 Expected URLs:
- **Backend**: `https://cinebook-6ys5.vercel.app`
- **Frontend**: `https://cinebook-frontend.vercel.app`

## 🧪 Testing After Deployment:
1. Test backend API: `https://your-backend.vercel.app/api/movie/movies`
2. Test frontend: `https://your-frontend.vercel.app`
3. Test login functionality
4. Test movie browsing

## 🔧 Troubleshooting:
- Check Vercel function logs for backend errors
- Verify environment variables are set correctly
- Ensure CORS includes your frontend domain
- Check MongoDB connection string is correct