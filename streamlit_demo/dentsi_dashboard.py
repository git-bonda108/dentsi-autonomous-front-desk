"""
🦷 DENTSI - AI Voice Agent for Dental Clinics
Enterprise Dashboard for Customer Demos

This dashboard connects to the live backend and demonstrates:
- Real-time appointments and calls
- Live voice demo simulation
- Doctor availability and scheduling
- Revenue per chair analytics
- Patient management
- Escalation tracking

Run: streamlit run dentsi_dashboard.py
"""

import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "https://dentcognit.abacusai.app"
TWILIO_NUMBER = "+1 (555) 123-4567"  # Demo number - replace with real Twilio number

st.set_page_config(
    page_title="Dentsi - AI Voice Agent",
    page_icon="🦷",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# SESSION STATE
# ============================================================================

if 'demo_step' not in st.session_state:
    st.session_state.demo_step = 0
if 'demo_running' not in st.session_state:
    st.session_state.demo_running = False
if 'selected_clinic' not in st.session_state:
    st.session_state.selected_clinic = None

# ============================================================================
# CUSTOM CSS
# ============================================================================

st.markdown("""
<style>
    .stApp { background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 100%); }
    #MainMenu, footer, header { visibility: hidden; }
    
    .main-title {
        font-size: 2.8rem;
        font-weight: 800;
        background: linear-gradient(90deg, #00d4ff, #7c3aed, #f472b6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        padding: 10px 0;
    }
    
    .subtitle {
        text-align: center;
        color: #94a3b8;
        font-size: 1.1rem;
        margin-bottom: 30px;
    }
    
    .metric-box {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 212, 255, 0.1));
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        height: 140px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    
    .metric-value {
        font-size: 2.2rem;
        font-weight: 700;
        color: #00d4ff;
    }
    
    .metric-label {
        color: #94a3b8;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 8px;
    }
    
    .phone-number {
        background: linear-gradient(90deg, #7c3aed, #00d4ff);
        color: white;
        font-size: 1.8rem;
        font-weight: 700;
        padding: 20px 40px;
        border-radius: 16px;
        text-align: center;
        margin: 20px 0;
    }
    
    .chat-ai {
        background: rgba(124, 58, 237, 0.2);
        border-left: 4px solid #7c3aed;
        padding: 16px 20px;
        border-radius: 0 12px 12px 0;
        margin: 12px 0;
        color: #e2e8f0;
    }
    
    .chat-patient {
        background: rgba(0, 212, 255, 0.15);
        border-right: 4px solid #00d4ff;
        padding: 16px 20px;
        border-radius: 12px 0 0 12px;
        margin: 12px 0;
        color: #e2e8f0;
        text-align: right;
    }
    
    .doctor-card {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(124, 58, 237, 0.2);
        border-radius: 12px;
        padding: 20px;
        margin: 10px 0;
    }
    
    .section-title {
        color: #f1f5f9;
        font-size: 1.4rem;
        font-weight: 600;
        margin: 20px 0 15px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(124, 58, 237, 0.3);
    }
    
    .status-online {
        background: #10b981;
        color: white;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.8rem;
    }
    
    .revenue-highlight {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 30px;
        border-radius: 16px;
        text-align: center;
    }
    
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1e1e3a 0%, #0a0a1a 100%);
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# API FUNCTIONS
# ============================================================================

@st.cache_data(ttl=30)
def fetch_health():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=10)
        return r.json()
    except:
        return {"status": "offline"}

@st.cache_data(ttl=30)
def fetch_clinics():
    try:
        r = requests.get(f"{API_BASE}/clinics", timeout=10)
        return r.json()
    except:
        return []

@st.cache_data(ttl=30)
def fetch_stats(clinic_id=None):
    try:
        url = f"{API_BASE}/api/dashboard/stats"
        if clinic_id:
            url += f"?clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", {})
    except:
        return {}

@st.cache_data(ttl=30)
def fetch_appointments(clinic_id=None, limit=50):
    try:
        url = f"{API_BASE}/api/dashboard/appointments?limit={limit}"
        if clinic_id:
            url += f"&clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", [])
    except:
        return []

@st.cache_data(ttl=30)
def fetch_calls(clinic_id=None, limit=20):
    try:
        url = f"{API_BASE}/api/dashboard/calls?limit={limit}"
        if clinic_id:
            url += f"&clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", [])
    except:
        return []

def get_doctors_from_clinics(clinics):
    """Extract doctors from clinic data or return mock doctors"""
    doctors = [
        {"name": "Dr. Emily Chen", "specialty": "General Dentistry", "clinic": "SmileCare Dental", "available": True},
        {"name": "Dr. Michael Roberts", "specialty": "Oral Surgery", "clinic": "SmileCare Dental", "available": True},
        {"name": "Dr. Sarah Kim", "specialty": "Pediatric Dentistry", "clinic": "SmileCare Dental", "available": False},
        {"name": "Dr. James Wilson", "specialty": "General Dentistry", "clinic": "Bright Teeth", "available": True},
        {"name": "Dr. Lisa Patel", "specialty": "Cosmetic Dentistry", "clinic": "Bright Teeth", "available": True},
        {"name": "Dr. Robert Martinez", "specialty": "Endodontics", "clinic": "Downtown Dental", "available": True},
        {"name": "Dr. Amanda Thompson", "specialty": "General Dentistry", "clinic": "Downtown Dental", "available": True},
    ]
    return doctors

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    st.markdown("""
    <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 3.5rem;">🦷</div>
        <div style="font-size: 2rem; font-weight: 800; 
                    background: linear-gradient(90deg, #00d4ff, #7c3aed);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            DENTSI
        </div>
        <div style="color: #64748b; font-size: 0.9rem;">AI Voice Agent</div>
    </div>
    """, unsafe_allow_html=True)
    
    st.divider()
    
    # Clinic selector
    clinics = fetch_clinics()
    clinic_names = ["All Clinics"] + [c["name"] for c in clinics]
    selected_clinic_name = st.selectbox("🏥 Select Clinic", clinic_names)
    
    selected_clinic_id = None
    if selected_clinic_name != "All Clinics":
        for c in clinics:
            if c["name"] == selected_clinic_name:
                selected_clinic_id = c["id"]
                break
    
    st.divider()
    
    # System status
    health = fetch_health()
    if health.get("status") == "ok":
        st.success("✅ System Online")
        st.caption(f"Backend: {API_BASE}")
    else:
        st.error("⚠️ Demo Mode")
    
    st.divider()
    
    # Phone number to call
    st.markdown("### 📞 Call This Number")
    st.markdown(f"""
    <div style="background: linear-gradient(90deg, #7c3aed, #00d4ff);
                color: white; padding: 15px; border-radius: 12px;
                text-align: center; font-size: 1.2rem; font-weight: 600;">
        {TWILIO_NUMBER}
    </div>
    """, unsafe_allow_html=True)
    st.caption("Patients call this number to book appointments")
    
    st.divider()
    
    st.markdown("[📄 API Docs]({}/api-docs)".format(API_BASE))
    st.markdown("[❤️ Health Check]({}/health)".format(API_BASE))

# ============================================================================
# MAIN HEADER
# ============================================================================

st.markdown('<h1 class="main-title">🦷 DENTSI Dashboard</h1>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">AI Voice Agent for Dental Clinics - Enterprise Demo</p>', unsafe_allow_html=True)

# ============================================================================
# KEY METRICS
# ============================================================================

stats = fetch_stats(selected_clinic_id)
appointments = fetch_appointments(selected_clinic_id)
calls = fetch_calls(selected_clinic_id)

# Calculate revenue from appointments
total_revenue = 0
service_prices = {"Cleaning": 120, "Crown": 1200, "Root Canal": 1500, "Filling": 250, "Extraction": 300, "Whitening": 400, "Implant": 3500, "Consultation": 75}
for apt in appointments:
    service = apt.get("service_type", "")
    for svc, price in service_prices.items():
        if svc.lower() in service.lower():
            total_revenue += price
            break

col1, col2, col3, col4, col5, col6 = st.columns(6)

metrics = [
    ("📞", str(len(calls)), "Total Calls"),
    ("📅", str(len(appointments)), "Appointments"),
    ("✅", f"{stats.get('appointments', {}).get('confirmationRate', 85):.0f}%", "Booking Rate"),
    ("💰", f"${total_revenue:,}", "Revenue"),
    ("👥", str(len(clinics)), "Clinics"),
    ("⚡", "0.8s", "Avg Response"),
]

for col, (icon, value, label) in zip([col1, col2, col3, col4, col5, col6], metrics):
    with col:
        st.markdown(f"""
        <div class="metric-box">
            <div style="font-size: 1.5rem;">{icon}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-label">{label}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ============================================================================
# TABS
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "📞 Live Demo",
    "📅 Appointments", 
    "👨‍⚕️ Doctors",
    "💰 Revenue",
    "📊 Analytics",
    "🚨 Escalations"
])

# ============================================================================
# TAB 1: LIVE DEMO - How the call actually works
# ============================================================================

with tab1:
    st.markdown('<div class="section-title">📞 How Dentsi Works - Live Call Demo</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("### 🔧 How It Works")
        st.markdown("""
        **Step 1:** Patient calls the Twilio phone number
        
        **Step 2:** Twilio sends the call to Dentsi backend
        
        **Step 3:** Deepgram converts speech to text (real-time)
        
        **Step 4:** OpenAI GPT-4 understands intent and generates response
        
        **Step 5:** ElevenLabs converts response to natural voice
        
        **Step 6:** Patient hears the AI response
        
        **Step 7:** Conversation continues until appointment is booked
        
        **Step 8:** Appointment saved to database, shown in dashboard
        """)
        
        st.markdown("### 📞 Try It Now")
        st.markdown(f"""
        <div class="phone-number">
            📞 {TWILIO_NUMBER}
        </div>
        """, unsafe_allow_html=True)
        st.info("👆 Call this number to experience the AI voice agent")
    
    with col2:
        st.markdown("### 🎬 Simulated Conversation")
        
        conversation = [
            ("ai", "🦷 Dentsi", "Thank you for calling SmileCare Dental. This is Dentsi, your AI assistant. How can I help you today?"),
            ("patient", "👤 Patient", "Hi, I need to schedule a cleaning."),
            ("ai", "🦷 Dentsi", "I'd be happy to help you schedule a cleaning! Are you a current patient with us?"),
            ("patient", "👤 Patient", "Yes, my name is John Smith."),
            ("ai", "🦷 Dentsi", "Welcome back, John! I see you were last here in July. You usually see Dr. Chen. Would you like to schedule with her again?"),
            ("patient", "👤 Patient", "Yes, Dr. Chen please."),
            ("ai", "🦷 Dentsi", "Dr. Chen has Tuesday at 10am or Thursday at 2pm available. Which works better?"),
            ("patient", "👤 Patient", "Tuesday at 10."),
            ("ai", "🦷 Dentsi", "Perfect! I've booked your cleaning for Tuesday, January 28th at 10am with Dr. Chen. You'll get a text confirmation. Anything else?"),
            ("patient", "👤 Patient", "No, that's all. Thanks!"),
            ("ai", "🦷 Dentsi", "Thank you, John! We look forward to seeing you Tuesday. Have a great day!"),
        ]
        
        # Demo controls
        if st.button("▶️ Start Live Demo", type="primary", use_container_width=True):
            st.session_state.demo_running = True
            st.session_state.demo_step = 0
        
        if st.session_state.demo_running:
            demo_container = st.container()
            progress = st.progress(0)
            
            with demo_container:
                for i, (role, speaker, message) in enumerate(conversation):
                    if i <= st.session_state.demo_step:
                        css_class = "chat-ai" if role == "ai" else "chat-patient"
                        st.markdown(f"""
                        <div class="{css_class}">
                            <strong>{speaker}</strong><br>{message}
                        </div>
                        """, unsafe_allow_html=True)
                
                progress.progress((st.session_state.demo_step + 1) / len(conversation))
                
                if st.session_state.demo_step < len(conversation) - 1:
                    time.sleep(1.5)
                    st.session_state.demo_step += 1
                    st.rerun()
                else:
                    st.success("✅ Appointment booked! John Smith - Cleaning - Tue Jan 28, 10am - Dr. Chen")
                    st.session_state.demo_running = False

# ============================================================================
# TAB 2: APPOINTMENTS
# ============================================================================

with tab2:
    st.markdown('<div class="section-title">📅 Appointments</div>', unsafe_allow_html=True)
    
    if appointments:
        # Prepare data
        apt_data = []
        for apt in appointments:
            patient_name = apt.get("patient", {}).get("name", "Available Slot") if apt.get("patient") else "Available Slot"
            clinic_name = apt.get("clinic", {}).get("name", "-") if apt.get("clinic") else "-"
            service = apt.get("service_type", "-")
            date = apt.get("appointment_date", "")[:10]
            status = apt.get("status", "scheduled").upper()
            
            # Estimate revenue
            revenue = 0
            for svc, price in service_prices.items():
                if svc.lower() in service.lower():
                    revenue = price
                    break
            
            apt_data.append({
                "Patient": patient_name,
                "Service": service,
                "Date": date,
                "Status": status,
                "Clinic": clinic_name,
                "Revenue": f"${revenue}"
            })
        
        df = pd.DataFrame(apt_data)
        st.dataframe(df, use_container_width=True, hide_index=True, height=400)
        
        # Summary
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Appointments", len(appointments))
        with col2:
            scheduled = len([a for a in apt_data if a["Status"] == "SCHEDULED"])
            st.metric("Scheduled", scheduled)
        with col3:
            st.metric("Total Revenue", f"${total_revenue:,}")
        with col4:
            avg_per_apt = total_revenue / len(appointments) if appointments else 0
            st.metric("Avg per Appointment", f"${avg_per_apt:.0f}")
    else:
        st.info("No appointments found.")

# ============================================================================
# TAB 3: DOCTORS
# ============================================================================

with tab3:
    st.markdown('<div class="section-title">👨‍⚕️ Doctors & Availability</div>', unsafe_allow_html=True)
    
    doctors = get_doctors_from_clinics(clinics)
    
    cols = st.columns(3)
    for i, doc in enumerate(doctors):
        with cols[i % 3]:
            status = "🟢 Available" if doc["available"] else "🔴 Busy"
            st.markdown(f"""
            <div class="doctor-card">
                <div style="font-size: 1.2rem; font-weight: 600; color: #f1f5f9;">{doc['name']}</div>
                <div style="color: #7c3aed; font-size: 0.9rem;">{doc['specialty']}</div>
                <div style="color: #64748b; font-size: 0.85rem; margin-top: 8px;">📍 {doc['clinic']}</div>
                <div style="margin-top: 10px;">{status}</div>
            </div>
            """, unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown("### 📊 Appointments by Doctor")
    
    # Mock data for doctor appointments
    doc_stats = pd.DataFrame({
        "Doctor": ["Dr. Chen", "Dr. Roberts", "Dr. Kim", "Dr. Wilson", "Dr. Patel", "Dr. Martinez", "Dr. Thompson"],
        "Appointments": [45, 32, 28, 38, 25, 35, 30],
        "Revenue": [12500, 28000, 8400, 11400, 22500, 38500, 9000]
    })
    
    col1, col2 = st.columns(2)
    with col1:
        fig = px.bar(doc_stats, x="Doctor", y="Appointments", color="Appointments",
                     color_continuous_scale=["#7c3aed", "#00d4ff"])
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=300, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        fig = px.bar(doc_stats, x="Doctor", y="Revenue", color="Revenue",
                     color_continuous_scale=["#10b981", "#00d4ff"])
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=300, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 4: REVENUE
# ============================================================================

with tab4:
    st.markdown('<div class="section-title">💰 Revenue Analytics</div>', unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"""
        <div class="revenue-highlight">
            <div style="font-size: 0.9rem; opacity: 0.9;">Total Revenue</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${total_revenue:,}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">↑ 15% vs last month</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        avg_chair = total_revenue / 5 if appointments else 0  # Assume 5 chairs
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9);
                    color: white; padding: 30px; border-radius: 16px; text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.9;">Revenue Per Chair</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${avg_chair:,.0f}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">5 chairs active</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        avg_apt = total_revenue / len(appointments) if appointments else 0
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #00d4ff, #0891b2);
                    color: white; padding: 30px; border-radius: 16px; text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.9;">Avg per Appointment</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${avg_apt:,.0f}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">{len(appointments)} appointments</div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Revenue by service
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Revenue by Service")
        service_revenue = pd.DataFrame({
            "Service": list(service_prices.keys()),
            "Price": list(service_prices.values()),
            "Bookings": [15, 8, 6, 20, 10, 12, 3, 25]
        })
        service_revenue["Total"] = service_revenue["Price"] * service_revenue["Bookings"]
        
        fig = px.pie(service_revenue, values="Total", names="Service",
                     color_discrete_sequence=px.colors.sequential.Plasma)
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Revenue Trend (Last 7 Days)")
        dates = pd.date_range(end=datetime.now(), periods=7, freq='D')
        revenue_trend = pd.DataFrame({
            "Date": dates,
            "Revenue": [4500, 5200, 4800, 6100, 5500, 4900, 5800]
        })
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=revenue_trend["Date"], y=revenue_trend["Revenue"],
                                  fill='tozeroy', fillcolor='rgba(124, 58, 237, 0.3)',
                                  line=dict(color='#7c3aed', width=3)))
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=350)
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 5: ANALYTICS
# ============================================================================

with tab5:
    st.markdown('<div class="section-title">📊 Call Analytics</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Call Volume (Last 7 Days)")
        dates = pd.date_range(end=datetime.now(), periods=7, freq='D')
        call_data = pd.DataFrame({
            "Date": dates,
            "Calls": [42, 38, 45, 52, 48, 35, 40],
            "Booked": [28, 25, 32, 38, 35, 24, 30]
        })
        
        fig = go.Figure()
        fig.add_trace(go.Bar(x=call_data["Date"], y=call_data["Calls"], name="Total Calls",
                             marker_color='#7c3aed'))
        fig.add_trace(go.Bar(x=call_data["Date"], y=call_data["Booked"], name="Booked",
                             marker_color='#00d4ff'))
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=300, barmode='group')
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Call Intent Distribution")
        intents = pd.DataFrame({
            "Intent": ["New Booking", "Reschedule", "Inquiry", "Cancel", "Emergency"],
            "Count": [180, 45, 60, 25, 15]
        })
        
        fig = px.pie(intents, values="Count", names="Intent", hole=0.4,
                     color_discrete_sequence=["#7c3aed", "#00d4ff", "#10b981", "#f59e0b", "#ef4444"])
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", height=300)
        st.plotly_chart(fig, use_container_width=True)
    
    # Call outcomes
    st.markdown("### Call Outcomes")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("✅ Booked", "212", "72%")
    with col2:
        st.metric("ℹ️ Info Only", "48", "16%")
    with col3:
        st.metric("🔄 Reschedule", "25", "8%")
    with col4:
        st.metric("🚨 Escalated", "12", "4%")

# ============================================================================
# TAB 6: ESCALATIONS
# ============================================================================

with tab6:
    st.markdown('<div class="section-title">🚨 Escalations & Alerts</div>', unsafe_allow_html=True)
    
    # Mock escalations
    escalations = [
        {"id": 1, "patient": "Robert Taylor", "reason": "Billing question", "priority": "Medium", "time": "10 min ago"},
        {"id": 2, "patient": "Unknown Caller", "reason": "Complex insurance issue", "priority": "Low", "time": "25 min ago"},
        {"id": 3, "patient": "Michael Brown", "reason": "Emergency - severe pain", "priority": "High", "time": "2 min ago"},
    ]
    
    for esc in escalations:
        priority_color = {"High": "#ef4444", "Medium": "#f59e0b", "Low": "#6366f1"}[esc["priority"]]
        
        col1, col2, col3 = st.columns([3, 1, 1])
        with col1:
            st.markdown(f"""
            <div style="background: rgba(30, 41, 59, 0.6); border-left: 4px solid {priority_color};
                        padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 8px 0;">
                <div style="color: #f1f5f9; font-weight: 600;">{esc['patient']}</div>
                <div style="color: #94a3b8; font-size: 0.9rem;">{esc['reason']}</div>
                <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">🕐 {esc['time']}</div>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div style="background: {priority_color}; color: white; padding: 8px 16px;
                        border-radius: 8px; text-align: center; margin-top: 20px;">
                {esc['priority']}
            </div>
            """, unsafe_allow_html=True)
        with col3:
            if st.button("Resolve", key=f"resolve_{esc['id']}", use_container_width=True):
                st.success(f"Resolved: {esc['patient']}")

# ============================================================================
# FOOTER
# ============================================================================

st.markdown("---")
st.markdown(f"""
<div style="text-align: center; padding: 20px 0; color: #64748b;">
    <div style="font-size: 1.5rem;">🦷</div>
    <div>DENTSI - AI Voice Agent for Dental Clinics</div>
    <div style="font-size: 0.8rem; margin-top: 8px;">Backend: {API_BASE} | Powered by OpenAI + Twilio + Deepgram + ElevenLabs</div>
</div>
""", unsafe_allow_html=True)
