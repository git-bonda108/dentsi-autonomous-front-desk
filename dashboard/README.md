# Dentra Dashboard - Next.js Frontend

**Modern React dashboard for managing dental clinic AI voice agent operations.**

## 📦 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client for API calls
- **Recharts** - Data visualization
- **Lucide React** - Beautiful icons

## 🚀 Features

### Dashboard Overview
- Real-time statistics (calls, appointments, revenue)
- System health monitoring
- Clinic filtering
- Success rate tracking

### Appointments Management
- View all appointments with pagination
- Filter by clinic, status, date range
- Patient information display
- Service type tracking

### Escalation Queue
- View calls requiring attention
- One-click resolve action
- Real-time updates
- FIFO queue ordering

### System Health
- Live health status (healthy/degraded/critical)
- Error rate monitoring
- Escalation rate tracking
- Average call duration
- Auto-refresh every 30 seconds

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Yarn package manager
- Backend API running on port 3000

### Installation

```bash
# Install dependencies
cd /home/ubuntu/dentra_backend/dashboard
yarn install

# Start development server
yarn dev
```

The dashboard will be available at **http://localhost:3001**

### Environment Variables

Create `.env.local` file:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production, set to your deployed API URL:

```bash
NEXT_PUBLIC_API_URL=https://your-api-domain.abacusai.app
```

### Available Scripts

```bash
# Development server (port 3001)
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Lint code
yarn lint
```

## 📁 Project Structure

```
dashboard/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles + Tailwind
│   ├── layout.tsx         # Root layout with Navigation
│   └── page.tsx           # Dashboard home page
├── components/            # React components
│   ├── Navigation.tsx     # Top navigation bar
│   ├── StatsCard.tsx      # Metric display cards
│   ├── ClinicSelector.tsx # Clinic filter dropdown
│   ├── AppointmentsTable.tsx
│   ├── EscalationsTable.tsx
│   └── SystemHealth.tsx
├── lib/                   # Utilities
│   ├── api.ts             # API client functions
│   ├── types.ts           # TypeScript interfaces
│   └── utils.ts           # Helper functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎨 Components

### StatsCard
Displays key metrics with icon, value, and optional trend.

**Props:**
- `title` - Card title
- `value` - Main metric value
- `icon` - Lucide icon component
- `description` - Optional description
- `trend` - Optional trend data
- `variant` - Color variant (default/success/warning/danger)

### AppointmentsTable
Paginated table of appointments with filtering.

**Props:**
- `clinicId` - Optional clinic filter
- `status` - Optional status filter
- `limit` - Items per page (default: 20)

### EscalationsTable
Queue of calls requiring staff attention.

**Props:**
- `clinicId` - Optional clinic filter

**Features:**
- One-click resolve
- Auto-reload after resolve
- Oldest-first ordering

### SystemHealth
Real-time system health monitoring.

**Props:**
- `clinicId` - Optional clinic filter

**Features:**
- Auto-refresh every 30 seconds
- Status indicator (healthy/degraded/critical)
- Metrics grid (calls, error rate, escalation rate, avg duration)
- Issues list when problems detected

## 🔗 API Integration

### API Functions

All API calls are in `lib/api.ts`:

```typescript
// Dashboard stats
fetchDashboardStats(clinicId?: string): Promise<DashboardStats>

// Appointments
fetchAppointments(clinicId?, status?, page?, limit?): Promise<PaginatedResponse<Appointment>>

// Calls
fetchCalls(clinicId?, status?, page?, limit?): Promise<PaginatedResponse<Call>>

// Escalations
fetchEscalations(clinicId?, type?, page?, limit?): Promise<PaginatedResponse<Escalation>>
resolveEscalation(id: string): Promise<void>

// Health
fetchHealthStatus(clinicId?: string): Promise<HealthStatus>

// Clinics & Patients
fetchClinics(): Promise<Clinic[]>
fetchPatients(): Promise<Patient[]>
```

### API Response Format

All API responses follow this format:

```typescript
{
  success: boolean,
  data: T,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

## 🎨 Styling

### Tailwind Configuration

Custom theme with CSS variables for easy theming:

```css
--primary: 221.2 83.2% 53.3%
--secondary: 210 40% 96.1%
--destructive: 0 84.2% 60.2%
--muted: 210 40% 96.1%
// ... and more
```

### Utility Functions

```typescript
// Merge Tailwind classes
cn(...classes)

// Format dates
formatDate(date, format?)
formatDateTime(date)
formatRelativeTime(date)

// Format phone numbers
formatPhoneNumber(phone)

// Get status badge colors
getStatusColor(status)
getHealthStatusColor(status)
```

## 📡 Real-time Updates

- System Health auto-refreshes every 30 seconds
- Tables reload on filter/page changes
- Escalations reload after resolve action

## 📱 Responsive Design

- Mobile-friendly navigation
- Responsive grid layouts
- Horizontal scroll on tables for mobile
- Adaptive spacing and typography

## 🚀 Deployment

### Build for Production

```bash
yarn build
```

### Deploy to Abacus.AI

1. Build the application
2. Use the Deploy button in UI
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` to your production API URL
4. Deploy to custom domain or auto-generated URL

### Environment Configuration

**Development:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Production:**
```
NEXT_PUBLIC_API_URL=https://dentra-api.abacusai.app
```

## 🤝 Integration with Backend

The dashboard connects to the NestJS backend API:

- **Backend:** Port 3000
- **Frontend:** Port 3001
- **API Base URL:** Configured via `NEXT_PUBLIC_API_URL`

### CORS Configuration

Make sure your backend allows requests from the frontend domain:

```typescript
// In NestJS main.ts
app.enableCors({
  origin: ['http://localhost:3001', 'https://your-frontend-domain.com'],
  credentials: true,
})
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Change port in package.json
"dev": "next dev -p 3002"
```

### API Connection Errors

1. Check backend is running on port 3000
2. Verify `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check browser console for CORS errors
4. Ensure backend has CORS enabled

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next
yarn build
```

### Type Errors

```bash
# Regenerate TypeScript types
yarn lint
```

## ✨ Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Advanced filtering with date pickers
- [ ] Export data to CSV/PDF
- [ ] Dark mode toggle
- [ ] User authentication
- [ ] Role-based access control
- [ ] Charts and analytics
- [ ] Call recordings playback
- [ ] SMS notifications

## 📚 Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Lucide Icons](https://lucide.dev/)

---

**Built with ❤️ using Next.js + TypeScript + Tailwind CSS**
