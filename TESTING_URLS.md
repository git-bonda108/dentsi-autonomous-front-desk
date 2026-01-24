# Dentra Testing URLs & Quick Start

## 🌐 Live URLs

### Dashboard (Frontend)
- **Local**: http://localhost:3001
- **Description**: Modern, beautiful UI for monitoring dental clinic operations

### Backend API
- **Preview URL**: https://c25fdd09e.preview.abacusai.app
- **Swagger Docs**: https://c25fdd09e.preview.abacusai.app/api-docs
- **Health Check**: https://c25fdd09e.preview.abacusai.app/health

---

## 🚀 Quick Start Testing

### 1. Open the Dashboard
```
http://localhost:3001
```

### 2. What You'll See
- ✅ **Clean, modern UI** with Dentra branding
- ✅ **6 colorful stat cards**: Calls, Appointments, Escalations, Revenue, Success Rate, System Health
- ✅ **Navigation tabs**: Dashboard | Appointments | Calls | Escalations | Clinics
- ✅ **Clinic filter**: Dropdown to filter by specific clinic or view all
- ✅ **Real-time data** from the backend API

### 3. Quick Smoke Test (2 minutes)
1. **Visual**: Verify the dashboard loads beautifully
2. **Navigation**: Click each tab - Dashboard, Appointments, Calls, Escalations, Clinics
3. **Filter**: Select different clinics from the dropdown
4. **Data**: Check that stats show real numbers (50 appointments from seed data)

---

## 📋 Test Cases Document
**Location**: `/home/ubuntu/dentra_backend/DASHBOARD_TEST_CASES.md`

**Contains**:
- 30+ comprehensive test cases
- Visual, functional, data integration, and E2E tests
- Quick smoke test checklist
- Expected results for each test
- Known issues and success criteria

---

## 🎨 What Makes This UI Special

### Design Highlights
- **Modern Minimalism**: Clean, uncluttered interface
- **Colorful Icons**: Blue, green, orange, purple for visual hierarchy
- **Responsive**: Works on all screen sizes
- **Professional Typography**: Consistent, readable fonts
- **Smooth Interactions**: Hover effects and transitions
- **Real-Time Data**: Live updates from production backend

### Key Features
1. **Multi-Clinic Management**: Filter by clinic or view aggregated data
2. **Real-Time Stats**: Total calls, appointments, revenue, success rate
3. **Appointment Tracking**: List view with status badges
4. **Call Logs**: Complete call history with duration and status
5. **Escalation Queue**: Prioritized alerts requiring attention
6. **System Health**: Live monitoring with error rates and metrics
7. **Clinic Directory**: Complete information for all dental clinics

---

## 📊 Expected Data (From Seed)

- **Clinics**: 5 (Chicago, NY, LA, Houston, Phoenix)
- **Patients**: 20
- **Services**: 25 (with prices)
- **Appointments**: 50 (25 confirmed, 25 cancelled)
- **Calls**: 0 (test this separately)
- **Escalations**: 0

---

## 🧪 Priority Test Areas

### HIGH PRIORITY
1. **Dashboard Page**: All 6 stat cards display correctly
2. **Clinic Filter**: Dropdown works and filters data
3. **Navigation**: All tabs load without errors
4. **Appointments Page**: Shows 50 appointments from seed data
5. **Backend Connection**: API calls successful (check DevTools)

### MEDIUM PRIORITY
6. **Calls Page**: Displays properly (may be empty)
7. **Escalations Page**: Handles empty state gracefully
8. **Clinics Page**: Shows all 5 clinics with details
9. **System Health**: Metrics display correctly

### OPTIONAL
10. **Performance**: Fast loading, smooth interactions
11. **Error Handling**: Graceful degradation if backend offline

---

## 🐛 Debugging Tips

### Dashboard Not Loading?
```bash
cd /home/ubuntu/dentra_backend/dashboard
tail -f dashboard.log
```

### Backend Not Responding?
```bash
cd /home/ubuntu/dentra_backend/nodejs_space
tail -f nohup.out
```

### Check API Connectivity
```bash
curl https://c25fdd09e.preview.abacusai.app/health
```

---

## ✅ Success Criteria

The system is **production-ready** if:
- ✅ Dashboard loads in < 2 seconds
- ✅ All navigation tabs work
- ✅ Stats show accurate data from backend
- ✅ Clinic filtering works correctly
- ✅ No console errors in browser DevTools
- ✅ UI is clean, modern, and professional
- ✅ Responsive on different screen sizes

---

## 📞 Test the Full System

### End-to-End Test Flow
1. **Dashboard**: View aggregated stats across all clinics
2. **Filter**: Select "Chicago Dental Center" - see filtered data
3. **Appointments**: Click tab - see appointment list with patient names
4. **Calls**: Click tab - check call logs (may be empty)
5. **Escalations**: Click tab - verify escalation queue
6. **Clinics**: Click tab - view all 5 clinic profiles
7. **System Health**: Scroll down on Dashboard - check health metrics

---

## 🎯 What to Look For

### The "WOW" Factors
- 🎨 **Beautiful Design**: Modern, clean, professional
- ⚡ **Fast Performance**: Smooth, responsive interactions
- 📊 **Rich Data**: Real-time stats and insights
- 🎯 **Intuitive UX**: Easy to navigate and understand
- 🔄 **Live Updates**: Data refreshes when you switch clinics
- 💼 **Production-Grade**: Ready for real dental clinics

---

**Start testing and enjoy the modern, beautiful UI! Let me know your feedback.** 🚀
