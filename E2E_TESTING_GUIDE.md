# 🧪 DENTRA MVP - END-TO-END TESTING GUIDE

**Preview URL:** https://c25fdd09e.preview.abacusai.app
**API Documentation:** https://c25fdd09e.preview.abacusai.app/api-docs
**Local Server:** http://localhost:3000

---

## 📊 MOCK DATA REFERENCE

### Clinics (5 total)

1. **SmileCare Dental**
   - ID: `ea239f20-2e76-4192-82bb-3ac9e7df4236`
   - Phone: +15551234567
   - Location: New York, NY
   - Hours: Mon-Thu 9-5, Fri 9-3
   - Appointments: 10

2. **Bright Teeth Family Dentistry**
   - ID: `ceb41ea3-6ac9-451a-b2ab-d4c9349bfa07`
   - Phone: +15552345678
   - Location: Los Angeles, CA
   - Hours: Mon-Thu 8-6, Fri 8-4, Sat 9-1
   - Appointments: 10

3. **Downtown Dental Associates**
   - ID: `d67e648c-fb32-4000-a7a6-b4f33a80f21c`
   - Phone: +15553456789
   - Location: Chicago, IL
   - Hours: Mon-Fri 9-5
   - Appointments: 10

4. **Riverside Dental Care**
   - ID: `e850ef04-8b73-453d-97f9-35693f927ccc`
   - Phone: +15554567890
   - Location: Houston, TX
   - Hours: Mon-Thu 8-5, Fri 8-3
   - Appointments: 10

5. **Gentle Touch Dentistry**
   - ID: `a489919c-2f96-44cb-81a9-65f5b8628e43`
   - Phone: +15555678901
   - Location: Phoenix, AZ
   - Hours: Mon-Thu 9-6, Fri 9-4, Sat 10-2
   - Appointments: 10

### Patients (20 total)

Sample patients:
- John Smith (+15551111111) - john.smith@email.com
- Sarah Johnson (+15552222222) - sarah.j@email.com
- Michael Brown (+15553333333) - mbrown@email.com
- Emily Davis (+15554444444) - emily.davis@email.com
- David Wilson (+15555555555) - dwilson@email.com

### Services Available at Each Clinic

1. **Regular Cleaning** - 60 min - $120
2. **Dental Filling** - 45 min - $250
3. **Crown Placement** - 90 min - $1,200
4. **Root Canal** - 120 min - $1,500
5. **Tooth Extraction** - 30 min - $300

### Appointments (50 total)

- **Per Clinic:** 10 appointments
- **Booked:** 6 per clinic (assigned to patients)
- **Available:** 4 per clinic (open slots)
- **Date Range:** Next 14 days
- **Status Types:** scheduled, available

---

## 🎯 TEST SCENARIOS

### SCENARIO 1: View Overall Dashboard Stats

**Purpose:** Get a bird's-eye view of all clinic operations

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/stats"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "calls": {
      "total": 0,
      "completed": 0,
      "failed": 0,
      "escalated": 0,
      "successRate": 0
    },
    "appointments": {
      "total": 50,
      "confirmed": 0,
      "cancelled": 0,
      "confirmationRate": 0
    },
    "revenue": {
      "estimated": 0,
      "currency": "USD"
    }
  }
}
```

**What to Check:**
- ✅ Total appointments = 50
- ✅ No calls yet (Twilio not connected)
- ✅ Revenue = $0 (no confirmed appointments yet)

---

### SCENARIO 2: Filter Stats by Specific Clinic

**Purpose:** View stats for SmileCare Dental only

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/stats?clinicId=ea239f20-2e76-4192-82bb-3ac9e7df4236"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "calls": { "total": 0, ... },
    "appointments": {
      "total": 10,
      "confirmed": 0,
      "cancelled": 0,
      "confirmationRate": 0
    },
    "revenue": { "estimated": 0, "currency": "USD" }
  }
}
```

**What to Check:**
- ✅ Total appointments = 10 (only SmileCare)
- ✅ Response time < 100ms

---

### SCENARIO 3: List All Appointments (Paginated)

**Purpose:** View appointments with pagination

```bash
# First page (5 appointments)
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?page=1&limit=5"

# Second page
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?page=2&limit=5"
```

**Expected Result (Page 1):**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "clinic_id": "...",
      "patient_id": "..." or null,
      "appointment_date": "2026-01-12T15:00:00.000Z",
      "service_type": "Regular Cleaning" or "Available Slot",
      "status": "scheduled" or "available",
      "clinic": {
        "id": "...",
        "name": "SmileCare Dental"
      },
      "patient": {
        "id": "...",
        "name": "John Smith"
      } or null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50,
    "totalPages": 10
  }
}
```

**What to Check:**
- ✅ Returns exactly 5 appointments
- ✅ Total = 50, totalPages = 10
- ✅ Includes clinic and patient details
- ✅ Some have patient_id (booked), some are null (available)

---

### SCENARIO 4: Filter Appointments by Clinic

**Purpose:** View only appointments for Bright Teeth Family Dentistry

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?clinicId=ceb41ea3-6ac9-451a-b2ab-d4c9349bfa07"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [ /* 10 appointments */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

**What to Check:**
- ✅ Exactly 10 appointments returned
- ✅ All belong to "Bright Teeth Family Dentistry"

---

### SCENARIO 5: Filter Appointments by Status

**Purpose:** View only booked appointments

```bash
# Booked appointments
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?status=scheduled"

# Available slots
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?status=available"
```

**Expected Result (scheduled):**
```json
{
  "success": true,
  "data": [ /* ~30 appointments */ ],
  "pagination": {
    "total": 30,  // 6 per clinic × 5 clinics
    "totalPages": 2
  }
}
```

**Expected Result (available):**
```json
{
  "success": true,
  "data": [ /* ~20 appointments */ ],
  "pagination": {
    "total": 20,  // 4 per clinic × 5 clinics
    "totalPages": 1
  }
}
```

**What to Check:**
- ✅ Scheduled: ~30 appointments (all have patient_id)
- ✅ Available: ~20 appointments (patient_id is null)

---

### SCENARIO 6: Filter by Date Range

**Purpose:** View appointments in next 7 days

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?startDate=2026-01-11&endDate=2026-01-18"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [ /* subset of appointments */ ],
  "pagination": {
    "total": 25,  // approximately half
    "totalPages": 2
  }
}
```

**What to Check:**
- ✅ All appointment_date values are within the specified range
- ✅ Fewer than 50 appointments returned

---

### SCENARIO 7: Combine Multiple Filters

**Purpose:** View available slots at SmileCare in next 7 days

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?clinicId=ea239f20-2e76-4192-82bb-3ac9e7df4236&status=available&startDate=2026-01-11&endDate=2026-01-18&limit=10"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [ /* 1-4 appointments */ ],
  "pagination": {
    "total": 2,  // ~half of 4 available slots
    "totalPages": 1
  }
}
```

**What to Check:**
- ✅ All appointments match ALL filters
- ✅ Clinic = SmileCare
- ✅ Status = available
- ✅ Dates within range

---

### SCENARIO 8: View All Clinics with Counts

**Purpose:** See all clinics and their appointment counts

```bash
curl "https://c25fdd09e.preview.abacusai.app/clinics"
```

**Expected Result:**
```json
[
  {
    "id": "ea239f20-2e76-4192-82bb-3ac9e7df4236",
    "name": "SmileCare Dental",
    "phone": "+15551234567",
    "address": "123 Main St, New York, NY 10001",
    "hours": "{...}",
    "services": [ /* 5 services */ ],
    "_count": {
      "appointments": 10,
      "calls": 0
    }
  }
  // ... 4 more clinics
]
```

**What to Check:**
- ✅ 5 clinics returned
- ✅ Each has 10 appointments
- ✅ Each has 5 services
- ✅ 0 calls (Twilio not connected yet)

---

### SCENARIO 9: View All Patients

**Purpose:** List all registered patients

```bash
curl "https://c25fdd09e.preview.abacusai.app/patients"
```

**Expected Result:**
```json
[
  {
    "id": "...",
    "name": "John Smith",
    "phone": "+15551111111",
    "email": "john.smith@email.com",
    "date_of_birth": "1985-03-15T00:00:00.000Z",
    "insurance_info": "{\"provider\":\"Blue Cross\",\"policy\":\"BC123456\"}",
    "created_at": "...",
    "updated_at": "...",
    "_count": {
      "appointments": 2  // varies per patient
    }
  }
  // ... 19 more patients
]
```

**What to Check:**
- ✅ 20 patients returned
- ✅ Valid phone numbers, emails
- ✅ Insurance info as JSON string
- ✅ Appointment counts vary

---

### SCENARIO 10: System Health Check

**Purpose:** Monitor overall system health

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/health"
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-11T10:45:00.000Z",
    "metrics": {
      "totalCalls24h": 0,
      "errorRate": 0,
      "escalationRate": 0,
      "avgCallDuration": 0
    },
    "issues": []
  }
}
```

**What to Check:**
- ✅ Status = "healthy"
- ✅ All metrics = 0 (no calls yet)
- ✅ No issues

---

### SCENARIO 11: Check Escalation Queue (Empty)

**Purpose:** View calls requiring staff attention

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/escalations"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

**What to Check:**
- ✅ Empty array (no calls yet)
- ✅ Total = 0

---

### SCENARIO 12: View Calls List (Empty)

**Purpose:** List all incoming calls

```bash
curl "https://c25fdd09e.preview.abacusai.app/dashboard/calls"
```

**Expected Result:**
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

**What to Check:**
- ✅ Empty array (Twilio not connected)
- ✅ Total = 0

---

## 🎨 SWAGGER UI TESTING

**Access:** https://c25fdd09e.preview.abacusai.app/api-docs

### Test via Swagger UI

1. **Open Swagger UI** in your browser
2. **Expand any endpoint** (e.g., GET /dashboard/stats)
3. **Click "Try it out"**
4. **Enter parameters** (optional, e.g., clinicId)
5. **Click "Execute"**
6. **View response** below

### Available Sections

1. **Health** - System health check
2. **Clinics** - Clinic management
3. **Patients** - Patient management
4. **Calls** - Call tracking
5. **Dashboard** - Ops console (8 endpoints)
6. **Webhook** - Twilio webhooks

---

## 🔗 QUICK TEST LINKS

Copy-paste these into your browser:

### Dashboard Stats
```
https://c25fdd09e.preview.abacusai.app/dashboard/stats
```

### All Appointments (First 10)
```
https://c25fdd09e.preview.abacusai.app/dashboard/appointments?limit=10
```

### SmileCare Appointments
```
https://c25fdd09e.preview.abacusai.app/dashboard/appointments?clinicId=ea239f20-2e76-4192-82bb-3ac9e7df4236
```

### Available Slots Only
```
https://c25fdd09e.preview.abacusai.app/dashboard/appointments?status=available
```

### System Health
```
https://c25fdd09e.preview.abacusai.app/dashboard/health
```

### All Clinics
```
https://c25fdd09e.preview.abacusai.app/clinics
```

### All Patients
```
https://c25fdd09e.preview.abacusai.app/patients
```

### API Documentation
```
https://c25fdd09e.preview.abacusai.app/api-docs
```

---

## 🧑‍💻 ADVANCED TESTING (Command Line)

### Test with jq (Pretty JSON)

```bash
# Dashboard stats with formatting
curl -s "https://c25fdd09e.preview.abacusai.app/dashboard/stats" | jq '.'

# Extract only appointment count
curl -s "https://c25fdd09e.preview.abacusai.app/dashboard/stats" | jq '.data.appointments.total'

# List clinic names only
curl -s "https://c25fdd09e.preview.abacusai.app/clinics" | jq '.[].name'

# Count available slots
curl -s "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?status=available" | jq '.pagination.total'
```

### Test Performance

```bash
# Measure response time
time curl -s "https://c25fdd09e.preview.abacusai.app/dashboard/stats" > /dev/null

# Test with verbose output
curl -v "https://c25fdd09e.preview.abacusai.app/health"
```

### Test Error Handling

```bash
# Non-existent clinic ID
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?clinicId=invalid-id"

# Invalid status
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?status=invalid"

# Invalid pagination
curl "https://c25fdd09e.preview.abacusai.app/dashboard/appointments?page=-1"
```

---

## 🎬 POSTMAN COLLECTION

### Import into Postman

1. Open Postman
2. Click "Import"
3. Select "Link"
4. Paste: `https://c25fdd09e.preview.abacusai.app/api-docs-json`
5. Postman will auto-generate all requests

### Or Create Manual Collection

1. **New Collection**: "Dentra MVP"
2. **Base URL Variable**: `{{base_url}}` = `https://c25fdd09e.preview.abacusai.app`
3. **Add Requests:**
   - GET {{base_url}}/dashboard/stats
   - GET {{base_url}}/dashboard/appointments
   - GET {{base_url}}/clinics
   - etc.

---

## 📱 MOBILE TESTING

### Test on Phone Browser

1. Open Safari/Chrome on your phone
2. Navigate to: `https://c25fdd09e.preview.abacusai.app/api-docs`
3. Test endpoints directly from mobile

### Test with Mobile App (e.g., HTTP Client)

- Download "HTTP Client" or similar app
- Create GET request to preview URL
- View formatted JSON responses

---

## ⚠️ IMPORTANT NOTES

### Preview URL Limitations

- ⏰ **Temporary:** Preview URL available for limited time
- 🔄 **Auto-restarts:** Container may restart after inactivity
- 🚫 **No Twilio:** Webhook endpoints won't work until production deployment
- 💾 **Database:** Shared development database (data may change)

### To Deploy to Production

1. Click **Deploy** button in UI
2. Choose hostname (e.g., `dentra-api.abacusai.app`)
3. Wait for deployment (~1-2 minutes)
4. Update Twilio webhook URLs to production URL
5. Test with real phone numbers

### Current Limitations (As Expected)

- ❌ No calls yet (Twilio not connected)
- ❌ No escalations (no failed calls)
- ❌ Revenue = $0 (no confirmed appointments)
- ✅ All appointments present (50 total)
- ✅ All clinics present (5 total)
- ✅ All patients present (20 total)

---

## ✅ SUCCESS CRITERIA

### Your tests are successful if:

1. ✅ All endpoints return `{"success": true}`
2. ✅ Dashboard stats shows 50 total appointments
3. ✅ 5 clinics returned with 10 appointments each
4. ✅ 20 patients returned
5. ✅ Pagination works correctly
6. ✅ Filtering by clinic ID returns 10 appointments
7. ✅ Filtering by status works (scheduled vs available)
8. ✅ Date range filtering reduces results
9. ✅ System health shows "healthy" status
10. ✅ Swagger UI loads and works

---

## 🐛 TROUBLESHOOTING

### If Preview URL Not Working

```bash
# Check local server status
curl http://localhost:3000/health

# View server logs
tail -f /tmp/dentra_server.log

# Restart local server
cd /home/ubuntu/dentra_backend/nodejs_space
yarn start:dev
```

### If No Data Returned

```bash
# Re-seed database
cd /home/ubuntu/dentra_backend/nodejs_space
npx ts-node prisma/seed.ts
```

### If Server Error

- Check logs in UI (Logs Viewer button)
- Verify database connection
- Restart server

---

## 📞 NEXT STEPS: TWILIO INTEGRATION

### After Production Deployment

1. **Buy Twilio Phone Number**
2. **Configure Webhooks:**
   - Voice URL: `https://your-domain.abacusai.app/webhook/voice`
   - Status URL: `https://your-domain.abacusai.app/webhook/status`
3. **Test Real Call Flow:**
   - Call the Twilio number
   - AI agent answers
   - Try booking appointment
   - Check dashboard for new call data

---

**Happy Testing! 🎉**

If you encounter any issues, check the logs or let me know!
