"""
🦷 DENTSI - Complete AI Voice Agent Dashboard
Enterprise Demo with Browser Voice + Twilio Integration

Features:
1. Browser-based voice demo (Web Speech API simulation)
2. Twilio phone call integration
3. Real-time appointments & analytics
4. Doctor scheduling & revenue tracking

Run: streamlit run dentsi_complete.py
"""

import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import time
import uuid

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "https://dentcognit.abacusai.app"
TWILIO_NUMBER = "+1 (920) 891-4513"  # Your real Twilio number

st.set_page_config(
    page_title="Dentsi - AI Voice Agent",
    page_icon="🦷",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# SESSION STATE
# ============================================================================

if 'demo_session_id' not in st.session_state:
    st.session_state.demo_session_id = None
if 'conversation_history' not in st.session_state:
    st.session_state.conversation_history = []
if 'selected_clinic_id' not in st.session_state:
    st.session_state.selected_clinic_id = None

# ============================================================================
# CUSTOM CSS - Premium Dark Theme
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
    
    .metric-card {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(0, 212, 255, 0.1));
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        height: 130px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #00d4ff;
        line-height: 1.2;
    }
    
    .metric-label {
        color: #94a3b8;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 8px;
    }
    
    .phone-box {
        background: linear-gradient(90deg, #7c3aed, #00d4ff);
        color: white;
        font-size: 1.6rem;
        font-weight: 700;
        padding: 20px 30px;
        border-radius: 16px;
        text-align: center;
        margin: 15px 0;
    }
    
    .chat-container {
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(124, 58, 237, 0.2);
        border-radius: 16px;
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
    }
    
    .chat-bubble-ai {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(124, 58, 237, 0.1));
        border-left: 4px solid #7c3aed;
        padding: 12px 16px;
        border-radius: 0 12px 12px 0;
        margin: 10px 0;
        color: #e2e8f0;
    }
    
    .chat-bubble-user {
        background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 212, 255, 0.05));
        border-right: 4px solid #00d4ff;
        padding: 12px 16px;
        border-radius: 12px 0 0 12px;
        margin: 10px 0 10px 40px;
        color: #e2e8f0;
        text-align: right;
    }
    
    .doctor-card {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(124, 58, 237, 0.2);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
    }
    
    .section-header {
        color: #f1f5f9;
        font-size: 1.3rem;
        font-weight: 600;
        margin: 20px 0 15px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(124, 58, 237, 0.3);
    }
    
    .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    
    .status-online { background: #10b981; color: white; }
    .status-busy { background: #ef4444; color: white; }
    
    .revenue-box {
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 25px;
        border-radius: 16px;
        text-align: center;
    }
    
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1e1e3a 0%, #0a0a1a 100%);
    }
    
    .stTextInput input {
        background: rgba(30, 41, 59, 0.8) !important;
        border: 1px solid rgba(124, 58, 237, 0.3) !important;
        color: #e2e8f0 !important;
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

def start_demo_session(clinic_id=None, caller_phone=None):
    """Start a new demo conversation session"""
    try:
        r = requests.post(
            f"{API_BASE}/webhook/demo/start",
            json={"clinicId": clinic_id, "callerPhone": caller_phone},
            timeout=30
        )
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_demo_message(session_id, message, clinic_id=None):
    """Send a message in the demo conversation"""
    try:
        r = requests.post(
            f"{API_BASE}/webhook/demo",
            json={
                "sessionId": session_id,
                "userMessage": message,
                "clinicId": clinic_id
            },
            timeout=30
        )
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e), "response": f"Error: {str(e)}"}

def update_clinic_phone(clinic_id, phone):
    """Update a clinic's phone number"""
    try:
        r = requests.patch(
            f"{API_BASE}/clinics/{clinic_id}/phone",
            json={"phone": phone},
            timeout=10
        )
        return r.json()
    except Exception as e:
        return {"success": False, "error": str(e)}

# Service prices for revenue calculation
SERVICE_PRICES = {
    "Regular Cleaning": 120, "Deep Cleaning": 250, "Cleaning": 120,
    "Dental Filling": 250, "Filling": 250,
    "Crown Placement": 1200, "Crown": 1200,
    "Root Canal": 1500,
    "Tooth Extraction": 300, "Extraction": 300,
    "Teeth Whitening": 400, "Whitening": 400,
    "Dental Implant": 3500, "Implant": 3500,
    "Emergency Visit": 200, "Emergency": 200,
    "Consultation": 75, "Checkup": 75
}

def get_service_price(service_type):
    """Get price for a service type"""
    for key, price in SERVICE_PRICES.items():
        if key.lower() in service_type.lower():
            return price
    return 100  # Default

# Mock doctors data
DOCTORS = [
    {"name": "Dr. Emily Chen", "specialty": "General Dentistry", "clinic": "SmileCare Dental", "available": True, "appointments_today": 8, "revenue": 2400},
    {"name": "Dr. Michael Roberts", "specialty": "Oral Surgery", "clinic": "SmileCare Dental", "available": True, "appointments_today": 5, "revenue": 7500},
    {"name": "Dr. Sarah Kim", "specialty": "Pediatric Dentistry", "clinic": "SmileCare Dental", "available": False, "appointments_today": 6, "revenue": 1800},
    {"name": "Dr. James Wilson", "specialty": "General Dentistry", "clinic": "Bright Teeth", "available": True, "appointments_today": 7, "revenue": 2100},
    {"name": "Dr. Lisa Patel", "specialty": "Cosmetic Dentistry", "clinic": "Bright Teeth", "available": True, "appointments_today": 4, "revenue": 4800},
    {"name": "Dr. Robert Martinez", "specialty": "Endodontics", "clinic": "Downtown Dental", "available": True, "appointments_today": 6, "revenue": 9000},
    {"name": "Dr. Amanda Thompson", "specialty": "General Dentistry", "clinic": "Downtown Dental", "available": True, "appointments_today": 9, "revenue": 2700},
]

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
        <div style="color: #64748b; font-size: 0.9rem;">AI Voice Agent for Dental Clinics</div>
    </div>
    """, unsafe_allow_html=True)
    
    st.divider()
    
    # System status
    health = fetch_health()
    if health.get("status") == "ok":
        st.success("✅ Backend Online")
    else:
        st.error("⚠️ Backend Offline - Demo Mode")
    
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
                st.session_state.selected_clinic_id = c["id"]
                break
    
    st.divider()
    
    # Twilio phone number
    st.markdown("### 📞 Patient Call Line")
    st.markdown(f"""
    <div class="phone-box">
        📞 {TWILIO_NUMBER}
    </div>
    """, unsafe_allow_html=True)
    st.caption("Patients call this number to book appointments")
    
    # Configure Twilio number for clinic
    if clinics and st.checkbox("⚙️ Configure Twilio"):
        clinic_to_update = st.selectbox("Assign number to clinic:", [c["name"] for c in clinics])
        if st.button("Assign Phone Number"):
            for c in clinics:
                if c["name"] == clinic_to_update:
                    result = update_clinic_phone(c["id"], "+19208914513")
                    if result.get("success"):
                        st.success(f"✅ Assigned to {clinic_to_update}")
                        st.cache_data.clear()
                    else:
                        st.error("Failed to update")
                    break
    
    st.divider()
    st.markdown(f"[📄 API Docs]({API_BASE}/api-docs)")
    st.markdown(f"[❤️ Health Check]({API_BASE}/health)")

# ============================================================================
# MAIN HEADER
# ============================================================================

st.markdown('<h1 class="main-title">🦷 DENTSI</h1>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">AI Voice Agent for Dental Clinics - Enterprise Demo</p>', unsafe_allow_html=True)

# ============================================================================
# KEY METRICS
# ============================================================================

stats = fetch_stats(selected_clinic_id)
appointments = fetch_appointments(selected_clinic_id)
calls = fetch_calls(selected_clinic_id)

# Calculate revenue
total_revenue = sum(get_service_price(a.get("service_type", "")) for a in appointments if a.get("patient"))

col1, col2, col3, col4, col5, col6 = st.columns(6)

metrics = [
    ("📞", str(len(calls) if calls else 15), "Calls Today"),
    ("📅", str(len([a for a in appointments if a.get("patient")])), "Appointments"),
    ("✅", "87%", "Booking Rate"),
    ("💰", f"${total_revenue:,}", "Revenue"),
    ("🏥", str(len(clinics)), "Clinics"),
    ("⚡", "0.8s", "Avg Response"),
]

for col, (icon, value, label) in zip([col1, col2, col3, col4, col5, col6], metrics):
    with col:
        st.markdown(f"""
        <div class="metric-card">
            <div style="font-size: 1.4rem;">{icon}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-label">{label}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ============================================================================
# TABS
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "🎤 Try Demo",
    "📅 Appointments",
    "👨‍⚕️ Doctors",
    "💰 Revenue",
    "📊 Analytics",
    "🚨 Escalations"
])

# ============================================================================
# TAB 1: TRY DEMO - Interactive Voice Demo
# ============================================================================

with tab1:
    st.markdown('<div class="section-header">🎤 Try the AI Voice Agent</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("### 📱 Option 1: Call the Phone Number")
        st.markdown(f"""
        <div class="phone-box">
            📞 {TWILIO_NUMBER}
        </div>
        """, unsafe_allow_html=True)
        st.info("""
        **Call this number to experience the full AI voice agent:**
        - Natural voice conversation
        - Real-time speech recognition
        - AI-powered appointment booking
        - Instant confirmation
        """)
        
        st.markdown("---")
        
        st.markdown("### 🔧 How It Works")
        st.markdown("""
        ```
        Patient Calls → Twilio → Dentsi Backend
                                    ↓
                            Deepgram (Speech→Text)
                                    ↓
                            OpenAI GPT-4 (Understand)
                                    ↓
                            ElevenLabs (Text→Speech)
                                    ↓
                            Patient Hears Response
        ```
        """)
    
    with col2:
        st.markdown("### 💬 Option 2: Browser Demo")
        st.caption("Type messages to simulate a patient calling")
        
        # Demo controls
        if st.button("🔄 Start New Conversation", type="primary", use_container_width=True):
            result = start_demo_session(selected_clinic_id)
            if result.get("success"):
                st.session_state.demo_session_id = result.get("sessionId")
                st.session_state.conversation_history = [
                    {"role": "ai", "message": result.get("greeting", "Hello! How can I help you?")}
                ]
                st.success(f"Connected to {result.get('clinicName', 'clinic')}")
            else:
                # Fallback if API not available
                st.session_state.demo_session_id = f"demo-{int(time.time())}"
                st.session_state.conversation_history = [
                    {"role": "ai", "message": "Thank you for calling SmileCare Dental. This is Dentsi, your AI assistant. How can I help you today?"}
                ]
                st.info("Using demo mode")
        
        # Conversation display
        st.markdown('<div class="chat-container">', unsafe_allow_html=True)
        for msg in st.session_state.conversation_history:
            if msg["role"] == "ai":
                st.markdown(f'<div class="chat-bubble-ai"><strong>🦷 Dentsi:</strong> {msg["message"]}</div>', unsafe_allow_html=True)
            else:
                st.markdown(f'<div class="chat-bubble-user"><strong>You:</strong> {msg["message"]}</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
        
        # Message input
        user_input = st.text_input("Type your message:", placeholder="e.g., I'd like to schedule a cleaning", key="user_message")
        
        col_send, col_quick = st.columns([1, 2])
        with col_send:
            send_clicked = st.button("Send 📤", type="primary", use_container_width=True)
        
        # Quick responses
        with col_quick:
            quick = st.selectbox("Quick messages:", [
                "-- Select --",
                "I'd like to schedule a cleaning",
                "My name is John Smith",
                "Yes, I have Delta Dental insurance",
                "Tuesday morning works for me",
                "I have a toothache",
            ])
        
        if send_clicked and user_input:
            # Add user message
            st.session_state.conversation_history.append({"role": "user", "message": user_input})
            
            # Get AI response
            if st.session_state.demo_session_id:
                result = send_demo_message(
                    st.session_state.demo_session_id,
                    user_input,
                    selected_clinic_id
                )
                ai_response = result.get("response", "I understand. Let me help you with that.")
            else:
                # Fallback responses
                responses = {
                    "cleaning": "I'd be happy to help you schedule a cleaning! Are you a current patient with us?",
                    "name": "Nice to meet you! Do you have dental insurance you'd like us to use?",
                    "insurance": "Great! I have your insurance information. What day works best for you?",
                    "tuesday": "Perfect! I have Tuesday at 10am available with Dr. Chen. Shall I book that for you?",
                    "tooth": "I'm sorry to hear you're in pain. Let me get you in as soon as possible. This is urgent - we have an opening today at 2pm. Can you make it?"
                }
                ai_response = "I understand. How can I assist you further?"
                for key, resp in responses.items():
                    if key in user_input.lower():
                        ai_response = resp
                        break
            
            st.session_state.conversation_history.append({"role": "ai", "message": ai_response})
            st.rerun()
        
        if quick != "-- Select --":
            st.info(f"Click 'Send' after selecting: {quick}")

# ============================================================================
# TAB 2: APPOINTMENTS
# ============================================================================

with tab2:
    st.markdown('<div class="section-header">📅 Appointments</div>', unsafe_allow_html=True)
    
    if appointments:
        # Filter to only booked appointments
        booked = [a for a in appointments if a.get("patient")]
        
        if booked:
            apt_data = []
            for apt in booked:
                patient = apt.get("patient", {}) or {}
                clinic = apt.get("clinic", {}) or {}
                service = apt.get("service_type", "Consultation")
                price = get_service_price(service)
                
                apt_data.append({
                    "Patient": patient.get("name", "Unknown"),
                    "Phone": patient.get("phone", "-"),
                    "Service": service,
                    "Date": apt.get("appointment_date", "")[:10],
                    "Status": apt.get("status", "scheduled").upper(),
                    "Clinic": clinic.get("name", "-"),
                    "Revenue": f"${price}"
                })
            
            df = pd.DataFrame(apt_data)
            st.dataframe(df, use_container_width=True, hide_index=True, height=400)
            
            # Summary metrics
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Booked", len(booked))
            with col2:
                scheduled = len([a for a in apt_data if a["Status"] == "SCHEDULED"])
                st.metric("Scheduled", scheduled)
            with col3:
                st.metric("Total Revenue", f"${total_revenue:,}")
            with col4:
                avg = total_revenue // len(booked) if booked else 0
                st.metric("Avg / Appointment", f"${avg}")
        else:
            st.info("No booked appointments yet.")
    else:
        st.info("No appointment data available.")

# ============================================================================
# TAB 3: DOCTORS
# ============================================================================

with tab3:
    st.markdown('<div class="section-header">👨‍⚕️ Doctors & Availability</div>', unsafe_allow_html=True)
    
    cols = st.columns(3)
    for i, doc in enumerate(DOCTORS):
        with cols[i % 3]:
            status = "🟢 Available" if doc["available"] else "🔴 Busy"
            st.markdown(f"""
            <div class="doctor-card">
                <div style="font-size: 1.1rem; font-weight: 600; color: #f1f5f9;">{doc['name']}</div>
                <div style="color: #7c3aed; font-size: 0.85rem;">{doc['specialty']}</div>
                <div style="color: #64748b; font-size: 0.8rem; margin-top: 6px;">📍 {doc['clinic']}</div>
                <div style="margin-top: 8px; display: flex; justify-content: space-between;">
                    <span>{status}</span>
                    <span style="color: #10b981;">${doc['revenue']:,}</span>
                </div>
                <div style="color: #94a3b8; font-size: 0.75rem; margin-top: 4px;">
                    {doc['appointments_today']} appointments today
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    st.markdown("---")
    st.markdown("### 📊 Performance by Doctor")
    
    doc_df = pd.DataFrame(DOCTORS)
    
    col1, col2 = st.columns(2)
    with col1:
        fig = px.bar(doc_df, x="name", y="appointments_today", color="appointments_today",
                     color_continuous_scale=["#7c3aed", "#00d4ff"], title="Appointments Today")
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=300, showlegend=False)
        fig.update_xaxes(tickangle=45)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        fig = px.bar(doc_df, x="name", y="revenue", color="revenue",
                     color_continuous_scale=["#10b981", "#00d4ff"], title="Revenue Today")
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=300, showlegend=False)
        fig.update_xaxes(tickangle=45)
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 4: REVENUE
# ============================================================================

with tab4:
    st.markdown('<div class="section-header">💰 Revenue Analytics</div>', unsafe_allow_html=True)
    
    # Calculate totals
    total_doc_revenue = sum(d["revenue"] for d in DOCTORS)
    num_chairs = 5
    revenue_per_chair = total_doc_revenue // num_chairs
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"""
        <div class="revenue-box">
            <div style="font-size: 0.9rem; opacity: 0.9;">Total Revenue Today</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${total_doc_revenue:,}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">↑ 12% vs yesterday</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #7c3aed, #6d28d9);
                    color: white; padding: 25px; border-radius: 16px; text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.9;">Revenue Per Chair</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${revenue_per_chair:,}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">{num_chairs} chairs active</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        avg_per_patient = total_doc_revenue // sum(d["appointments_today"] for d in DOCTORS)
        st.markdown(f"""
        <div style="background: linear-gradient(135deg, #00d4ff, #0891b2);
                    color: white; padding: 25px; border-radius: 16px; text-align: center;">
            <div style="font-size: 0.9rem; opacity: 0.9;">Avg Per Patient</div>
            <div style="font-size: 2.5rem; font-weight: 700;">${avg_per_patient}</div>
            <div style="font-size: 0.85rem; margin-top: 8px;">{sum(d['appointments_today'] for d in DOCTORS)} patients today</div>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Revenue by Service")
        service_data = pd.DataFrame({
            "Service": ["Cleaning", "Root Canal", "Crown", "Filling", "Whitening", "Implant"],
            "Revenue": [3600, 6000, 4800, 2500, 1600, 7000],
            "Count": [30, 4, 4, 10, 4, 2]
        })
        fig = px.pie(service_data, values="Revenue", names="Service", hole=0.4,
                     color_discrete_sequence=px.colors.sequential.Plasma)
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Weekly Revenue Trend")
        dates = pd.date_range(end=datetime.now(), periods=7, freq='D')
        trend = pd.DataFrame({
            "Date": dates,
            "Revenue": [22000, 24500, 21800, 26100, 25500, 23900, total_doc_revenue]
        })
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=trend["Date"], y=trend["Revenue"],
                                  fill='tozeroy', fillcolor='rgba(124, 58, 237, 0.3)',
                                  line=dict(color='#7c3aed', width=3)))
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", 
                          plot_bgcolor="rgba(0,0,0,0)", height=350)
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 5: ANALYTICS
# ============================================================================

with tab5:
    st.markdown('<div class="section-header">📊 Call Analytics</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### Call Volume (Last 7 Days)")
        dates = pd.date_range(end=datetime.now(), periods=7, freq='D')
        call_data = pd.DataFrame({
            "Date": dates,
            "Total Calls": [42, 38, 45, 52, 48, 35, 40],
            "Booked": [28, 25, 32, 38, 35, 24, 30]
        })
        fig = go.Figure()
        fig.add_trace(go.Bar(x=call_data["Date"], y=call_data["Total Calls"], name="Total",
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
    
    # Metrics
    st.markdown("### Call Outcomes")
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("✅ Booked", "212", "72%")
    with col2:
        st.metric("ℹ️ Info Only", "48", "16%")
    with col3:
        st.metric("🔄 Reschedule", "25", "8%")
    with col4:
        st.metric("❌ Cancelled", "8", "3%")
    with col5:
        st.metric("🚨 Escalated", "4", "1%")

# ============================================================================
# TAB 6: ESCALATIONS
# ============================================================================

with tab6:
    st.markdown('<div class="section-header">🚨 Escalations & Alerts</div>', unsafe_allow_html=True)
    
    escalations = [
        {"id": 1, "patient": "Robert Taylor", "reason": "Billing question - needs payment plan", "priority": "Medium", "time": "10 min ago", "phone": "+1 555-777-7777"},
        {"id": 2, "patient": "Unknown Caller", "reason": "Complex insurance - needs manual verification", "priority": "Low", "time": "25 min ago", "phone": "+1 555-000-0000"},
        {"id": 3, "patient": "Michael Brown", "reason": "EMERGENCY - Severe tooth pain, needs same-day", "priority": "High", "time": "2 min ago", "phone": "+1 555-333-3333"},
    ]
    
    for esc in escalations:
        priority_color = {"High": "#ef4444", "Medium": "#f59e0b", "Low": "#6366f1"}[esc["priority"]]
        
        col1, col2, col3 = st.columns([4, 1, 1])
        with col1:
            st.markdown(f"""
            <div style="background: rgba(30, 41, 59, 0.6); border-left: 4px solid {priority_color};
                        padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 8px 0;">
                <div style="color: #f1f5f9; font-weight: 600;">{esc['patient']}</div>
                <div style="color: #94a3b8; font-size: 0.9rem;">{esc['reason']}</div>
                <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">
                    📞 {esc['phone']} | 🕐 {esc['time']}
                </div>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div style="background: {priority_color}; color: white; padding: 8px 16px;
                        border-radius: 8px; text-align: center; margin-top: 20px; font-weight: 600;">
                {esc['priority']}
            </div>
            """, unsafe_allow_html=True)
        with col3:
            if st.button("✓ Resolve", key=f"resolve_{esc['id']}", use_container_width=True):
                st.success(f"Resolved: {esc['patient']}")

# ============================================================================
# FOOTER
# ============================================================================

st.markdown("---")
st.markdown(f"""
<div style="text-align: center; padding: 20px 0; color: #64748b;">
    <div style="font-size: 2rem;">🦷</div>
    <div style="font-size: 1.1rem; font-weight: 600;">DENTSI - AI Voice Agent for Dental Clinics</div>
    <div style="font-size: 0.85rem; margin-top: 8px;">
        Backend: <a href="{API_BASE}" style="color: #7c3aed;">{API_BASE}</a> | 
        Phone: {TWILIO_NUMBER}
    </div>
    <div style="font-size: 0.75rem; margin-top: 12px; color: #475569;">
        Powered by OpenAI GPT-4 • Twilio • Deepgram • ElevenLabs
    </div>
</div>
""", unsafe_allow_html=True)
