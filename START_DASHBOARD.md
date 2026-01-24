# 🚀 Dentra Services - Live Preview Links

## ✅ All Services Running Successfully

### 1. Backend API (NestJS)
- **Local URL**: http://localhost:3000
- **Preview URL**: https://c25fdd09e.preview.abacusai.app
- **API Documentation**: https://c25fdd09e.preview.abacusai.app/api-docs
- **Health Check**: https://c25fdd09e.preview.abacusai.app/health

**Quick Test:**
```bash
curl https://c25fdd09e.preview.abacusai.app/health
```

### 2. Frontend Dashboard (Next.js)
- **Local URL**: http://localhost:3001
- **Status**: ✅ Running (React app with Tailwind CSS)

**Features:**
- Real-time dashboard with stats
- Appointments management
- Call logs
- Escalations tracking
- Clinic management
- System health monitoring

---

## 📊 Quick API Test Commands

### Get Dashboard Stats
```bash
curl https://c25fdd09e.preview.abacusai.app/dashboard/stats
```

### Get Clinics
```bash
curl https://c25fdd09e.preview.abacusai.app/clinics
```

### Get Appointments
```bash
curl https://c25fdd09e.preview.abacusai.app/dashboard/appointments?limit=10
```

### Get Calls
```bash
curl https://c25fdd09e.preview.abacusai.app/dashboard/calls?limit=10
```

### Get Escalations
```bash
curl https://c25fdd09e.preview.abacusai.app/dashboard/escalations
```

### Get System Health
```bash
curl https://c25fdd09e.preview.abacusai.app/dashboard/health
```

---

## 🗄️ Mock Data Summary

**Clinics**: 5 dental clinics with unique IDs
**Patients**: 20 patients across clinics
**Appointments**: 50 appointments (scheduled, confirmed, completed, cancelled)
**Services**: 25 dental services (cleaning, filling, root canal, etc.)

### Sample Clinic IDs:
1. `1` - Bright Smile Dentistry (Chicago)
2. `2` - Healthy Teeth Clinic (New York)
3. `3` - Perfect Dental Care (Los Angeles)
4. `4` - Comfort Dental (Houston)
5. `5` - Family Dental Practice (Phoenix)

---

## 🎯 Next Steps

1. **Test the API**: Visit the Swagger UI at https://c25fdd09e.preview.abacusai.app/api-docs
2. **View Dashboard**: Open http://localhost:3001 in your browser
3. **Integrate Twilio**: Configure webhook after production deployment
4. **Deploy to Production**: Use the Deploy button in the UI when ready

---

## 🔧 Service Status

| Service | Status | Port | URL |
|---------|--------|------|-----|
| Backend API | ✅ Running | 3000 | https://c25fdd09e.preview.abacusai.app |
| Frontend Dashboard | ✅ Running | 3001 | http://localhost:3001 |
| Database | ✅ Connected | 5432 | PostgreSQL |
| Swagger Docs | ✅ Available | 3000 | https://c25fdd09e.preview.abacusai.app/api-docs |

---

**Last Updated**: January 11, 2026, 11:35 AM IST
