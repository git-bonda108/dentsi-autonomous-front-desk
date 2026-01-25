"""
DENTRA AI Voice Agent - Demo Dashboard
A Streamlit-based dashboard for clinic demos

Run with: streamlit run app.py
"""

import streamlit as st
import requests
import pandas as pd
from datetime import datetime
import json

# Configuration
API_BASE = "https://dentcognit.abacusai.app"

st.set_page_config(
    page_title="DENTRA - AI Voice Agent",
    page_icon="🦷",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1e3a5f;
        margin-bottom: 0;
    }
    .sub-header {
        color: #64748b;
        font-size: 1.1rem;
        margin-top: 0;
    }
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 12px;
        color: white;
    }
    .stat-value {
        font-size: 2.5rem;
        font-weight: bold;
    }
    .stat-label {
        font-size: 0.9rem;
        opacity: 0.9;
    }
    .success-badge {
        background: #10b981;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
    }
    .warning-badge {
        background: #f59e0b;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
    }
</style>
""", unsafe_allow_html=True)

# API Functions
@st.cache_data(ttl=30)
def get_health():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=10)
        return r.json()
    except:
        return {"status": "error"}

@st.cache_data(ttl=30)
def get_clinics():
    try:
        r = requests.get(f"{API_BASE}/clinics", timeout=10)
        return r.json()
    except:
        return []

@st.cache_data(ttl=30)
def get_stats(clinic_id=None):
    try:
        url = f"{API_BASE}/api/dashboard/stats"
        if clinic_id:
            url += f"?clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", {})
    except:
        return {}

@st.cache_data(ttl=30)
def get_appointments(clinic_id=None, limit=20):
    try:
        url = f"{API_BASE}/api/dashboard/appointments?limit={limit}"
        if clinic_id:
            url += f"&clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", [])
    except:
        return []

@st.cache_data(ttl=30)
def get_calls(clinic_id=None, limit=20):
    try:
        url = f"{API_BASE}/api/dashboard/calls?limit={limit}"
        if clinic_id:
            url += f"&clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", [])
    except:
        return []

# Sidebar
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/2977/2977285.png", width=80)
    st.markdown("## DENTRA")
    st.markdown("*AI Voice Agent for Dental Clinics*")
    st.divider()
    
    # Clinic selector
    clinics = get_clinics()
    clinic_options = {"All Clinics": None}
    for c in clinics:
        clinic_options[c["name"]] = c["id"]
    
    selected_clinic_name = st.selectbox(
        "Select Clinic",
        options=list(clinic_options.keys())
    )
    selected_clinic_id = clinic_options[selected_clinic_name]
    
    st.divider()
    
    # Health status
    health = get_health()
    if health.get("status") == "ok":
        st.success("✅ System Online")
    else:
        st.error("❌ System Offline")
    
    st.divider()
    
    # Quick links
    st.markdown("### Quick Links")
    st.markdown(f"[📄 API Docs]({API_BASE}/api-docs)")
    st.markdown(f"[❤️ Health Check]({API_BASE}/health)")

# Main content
st.markdown('<p class="main-header">🦷 DENTRA Dashboard</p>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">AI Voice Agent for Dental Clinics - Real-Time Operations</p>', unsafe_allow_html=True)
st.divider()

# Load data
stats = get_stats(selected_clinic_id)

# Metrics row
col1, col2, col3, col4, col5, col6 = st.columns(6)

with col1:
    st.metric(
        "Total Calls",
        stats.get("calls", {}).get("total", 0),
        help="Total inbound calls handled"
    )

with col2:
    st.metric(
        "Appointments",
        stats.get("appointments", {}).get("total", 0),
        help="Total appointments in system"
    )

with col3:
    st.metric(
        "Confirmed",
        stats.get("appointments", {}).get("confirmed", 0),
        help="Confirmed appointments"
    )

with col4:
    st.metric(
        "Escalations",
        stats.get("calls", {}).get("escalated", 0),
        help="Calls requiring staff attention"
    )

with col5:
    success_rate = stats.get("calls", {}).get("successRate", 0)
    st.metric(
        "Success Rate",
        f"{success_rate:.1f}%",
        help="Call completion rate"
    )

with col6:
    revenue = stats.get("revenue", {}).get("estimated", 0)
    st.metric(
        "Est. Revenue",
        f"${revenue:,.0f}",
        help="Estimated revenue from appointments"
    )

st.divider()

# Tabs
tab1, tab2, tab3, tab4 = st.tabs(["📅 Appointments", "📞 Calls", "🏥 Clinics", "ℹ️ About"])

with tab1:
    st.subheader("Recent Appointments")
    
    appointments = get_appointments(selected_clinic_id, limit=20)
    
    if appointments:
        # Convert to DataFrame
        df = pd.DataFrame(appointments)
        
        # Format for display
        display_df = pd.DataFrame({
            "Patient": df.apply(lambda x: x["patient"]["name"] if x.get("patient") else "Available Slot", axis=1),
            "Clinic": df.apply(lambda x: x["clinic"]["name"] if x.get("clinic") else "-", axis=1),
            "Service": df["service_type"],
            "Date": pd.to_datetime(df["appointment_date"]).dt.strftime("%b %d, %Y"),
            "Status": df["status"].str.upper()
        })
        
        st.dataframe(
            display_df,
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("No appointments found.")

with tab2:
    st.subheader("Call History")
    
    calls = get_calls(selected_clinic_id, limit=20)
    
    if calls:
        df = pd.DataFrame(calls)
        
        display_df = pd.DataFrame({
            "Call ID": df["call_sid"].str[:12] + "...",
            "Clinic": df.apply(lambda x: x["clinic"]["name"] if x.get("clinic") else "-", axis=1),
            "Intent": df["intent"].fillna("Unknown"),
            "Duration": df["duration"].apply(lambda x: f"{x}s" if x else "-"),
            "Status": df["status"].str.upper(),
            "Outcome": df["outcome"].fillna("-"),
            "Date": pd.to_datetime(df["created_at"]).dt.strftime("%b %d %H:%M")
        })
        
        st.dataframe(
            display_df,
            use_container_width=True,
            hide_index=True
        )
    else:
        st.info("No calls recorded yet. Calls will appear here once the Twilio integration is activated.")

with tab3:
    st.subheader("Clinic Directory")
    
    for clinic in clinics:
        with st.expander(f"🏥 {clinic['name']}", expanded=False):
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown(f"**Phone:** {clinic['phone']}")
                st.markdown(f"**Address:** {clinic['address']}")
            
            with col2:
                hours = json.loads(clinic.get("hours", "{}"))
                st.markdown("**Hours:**")
                for day, time in hours.items():
                    st.markdown(f"- {day.title()}: {time}")
            
            # Services
            if clinic.get("services"):
                st.markdown("**Services:**")
                for svc in clinic["services"]:
                    st.markdown(f"- {svc['service_name']}: ${svc['price']:.0f} ({svc['duration_minutes']} min)")

with tab4:
    st.subheader("About DENTRA")
    
    st.markdown("""
    ### What is DENTRA?
    
    DENTRA is an **AI-powered voice agent** designed specifically for dental clinics. It handles:
    
    - 📞 **24/7 Call Answering** - Never miss a patient call
    - 📅 **Intelligent Scheduling** - Revenue-aware appointment booking
    - 🏥 **Insurance Collection** - Captures provider and member ID
    - 🩺 **Symptom Triage** - Prioritizes emergencies automatically
    - 📊 **Analytics** - Track performance and revenue impact
    
    ### The Dentra Crew
    
    Four AI agents work together:
    
    1. **VoiceAgent** - Natural conversation handling
    2. **SchedulerAgent** - Smart appointment booking
    3. **PolicyAgent** - HIPAA compliance
    4. **OpsAgent** - Escalation and recovery
    
    ### Key Benefits
    
    | Benefit | Impact |
    |---------|--------|
    | Revenue Recovery | $100K-150K annually |
    | Staff Time Saved | 3-4 hours/day |
    | After-Hours Coverage | 100% (vs 0%) |
    | No-Show Reduction | 30-40% |
    
    ### Technology
    
    - **LLM**: OpenAI GPT-4
    - **Voice**: Twilio + Deepgram + ElevenLabs
    - **Backend**: NestJS + PostgreSQL
    - **Hosting**: Abacus.AI
    """)

# Footer
st.divider()
st.markdown(
    f"<center><small>DENTRA AI Voice Agent | Backend: {API_BASE} | Last Updated: {datetime.now().strftime('%H:%M:%S')}</small></center>",
    unsafe_allow_html=True
)
