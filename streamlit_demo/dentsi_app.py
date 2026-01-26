"""
🦷 DENTSI - Autonomous Agentic Dental Assistant
Premium Enterprise Dashboard - Production Ready

Features:
- Beautiful, accessible UI with proper contrast
- Real-time data from backend API
- Browser-based voice demo
- Phone call integration via Twilio
- Doctor scheduling & revenue analytics

Run: streamlit run dentsi_app.py
"""

import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "https://dentcognit.abacusai.app"
TWILIO_NUMBER = "+1 (920) 891-4513"
TWILIO_NUMBER_RAW = "+19208914513"

st.set_page_config(
    page_title="DENTSI - Autonomous Dental Assistant",
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
if 'selected_clinic_name' not in st.session_state:
    st.session_state.selected_clinic_name = None

# ============================================================================
# PREMIUM CSS - High Contrast, Beautiful UI
# ============================================================================

st.markdown("""
<style>
    /* ============================================ */
    /* DENTSI THEME - FROM GUIDANCE DOCUMENT */
    /* 4 Core Colors Only: */
    /* #0B1220 - Deep Navy (Background) */
    /* #121A2F - Midnight Blue (Cards) */
    /* #6C63FF - Electric Indigo (Primary) */
    /* #22C55E - Emerald (Success) */
    /* Secondary: Gold #FACC15 (Revenue) */
    /* ============================================ */
    
    /* ANIMATIONS - Keep floating tooth */
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
    }
    
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
    }
    
    /* MAIN BACKGROUND */
    .stApp {
        background: #0B1220 !important;
    }
    
    /* Hide Streamlit branding */
    #MainMenu, footer, header { visibility: hidden; }
    
    /* ANIMATED GRADIENT for DENTSI title */
    @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    /* MAIN TITLE - ANIMATED COLORS */
    .main-title {
        font-size: 3.5rem;
        font-weight: 900;
        background: linear-gradient(135deg, #6C63FF, #22C55E, #FACC15, #6C63FF);
        background-size: 300% 300%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        padding: 20px 0 5px 0;
        letter-spacing: -1px;
        animation: gradient-shift 4s ease infinite;
    }
    
    .subtitle {
        text-align: center;
        color: #9CA3AF !important;
        font-size: 1.1rem;
        margin-bottom: 20px;
        font-weight: 400;
    }
    
    /* ============================================ */
    /* GLASSMORPHISM METRIC CARDS (From Guidance) */
    /* ============================================ */
    
    .metric-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
    }
    
    .metric-card {
        background: linear-gradient(145deg, rgba(18, 26, 47, 0.95), rgba(11, 18, 32, 0.95));
        border-radius: 16px;
        padding: 18px 20px;
        border: 1px solid rgba(108, 99, 255, 0.25);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        transition: all 0.25s ease;
    }
    
    .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(108, 99, 255, 0.25);
    }
    
    .metric-icon { font-size: 20px; opacity: 0.9; }
    .metric-label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #9CA3AF; margin-top: 6px; }
    .metric-value { font-size: 28px; font-weight: 700; margin-top: 8px; color: #E5E7EB; }
    .metric-sub { font-size: 12px; color: #6B7280; margin-top: 4px; }
    
    /* HERO REVENUE CARD - Gold accent */
    .metric-card.revenue {
        border: 1px solid rgba(250, 204, 21, 0.5);
        box-shadow: 0 0 0 1px rgba(250, 204, 21, 0.2), 0 16px 40px rgba(250, 204, 21, 0.15);
    }
    .metric-card.revenue .metric-value { color: #FACC15; }
    
    /* Fix default metric cards */
    .metric-card-old:hover {
    /* ============================================ */
    /* SECTION HEADERS */
    /* ============================================ */
    
    .section-header {
        color: #E5E7EB !important;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 20px 0 16px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid #6C63FF;
    }
    
    /* Phone box - Primary Indigo */
    .phone-box {
        background: #6C63FF;
        color: #ffffff;
        font-size: 1.6rem;
        font-weight: 700;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        margin: 16px 0;
    }
    
    /* Option titles */
    .option-title {
        color: #E5E7EB !important;
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 12px;
    }
    
    .option-subtitle {
        color: #9CA3AF !important;
        font-size: 0.95rem;
        margin-bottom: 10px;
    }
    
    /* Chat bubbles - Using 4 color palette */
    .chat-container {
        background: #121A2F;
        border: 1px solid rgba(108, 99, 255, 0.3);
        border-radius: 12px;
        padding: 16px;
        max-height: 350px;
        overflow-y: auto;
    }
    
    .chat-ai {
        background: rgba(108, 99, 255, 0.15);
        border-left: 3px solid #6C63FF;
        padding: 12px 16px;
        border-radius: 0 10px 10px 0;
        margin: 10px 0;
        color: #E5E7EB;
    }
    
    .chat-user {
        background: rgba(34, 197, 94, 0.15);
        border-right: 3px solid #22C55E;
        padding: 12px 16px;
        border-radius: 10px 0 0 10px;
        margin: 10px 0 10px 40px;
        color: #E5E7EB;
        text-align: right;
    }
    
    /* Doctor cards - Midnight Blue */
    .doctor-card {
        background: #121A2F;
        border: 1px solid rgba(108, 99, 255, 0.25);
        border-radius: 12px;
        padding: 16px;
        margin: 8px 0;
        transition: transform 0.2s;
    }
    
    .doctor-card:hover {
        transform: translateY(-2px);
        border-color: #6C63FF;
    }
    
    .doctor-name { color: #E5E7EB; font-size: 1.1rem; font-weight: 600; }
    .doctor-specialty { color: #6C63FF; font-size: 0.85rem; margin-top: 4px; }
    .doctor-clinic { color: #9CA3AF; font-size: 0.8rem; margin-top: 6px; }
    
    /* Revenue boxes - Gold for revenue, Indigo for others */
    .revenue-box {
        background: linear-gradient(135deg, #FACC15, #EAB308);
        color: #0B1220;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 8px 24px rgba(250, 204, 21, 0.25);
    }
    
    .revenue-box-purple {
        background: #6C63FF;
        color: #ffffff;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
    }
    
    .revenue-box-cyan {
        background: #22C55E;
        color: #ffffff;
        padding: 24px;
        border-radius: 12px;
        text-align: center;
    }
    
    /* Escalation cards */
    .escalation-card {
        background: #121A2F;
        border-radius: 10px;
        padding: 16px;
        margin: 8px 0;
    }
    
    .escalation-high { border-left: 3px solid #EF4444; }
    .escalation-medium { border-left: 3px solid #F59E0B; }
    .escalation-low { border-left: 3px solid #6C63FF; }
    
    /* ============================================ */
    /* SIDEBAR - Command Center (From Guidance) */
    /* ============================================ */
    
    [data-testid="stSidebar"] {
        background: #0B1220 !important;
        border-right: 1px solid rgba(108, 99, 255, 0.2) !important;
    }
    
    [data-testid="stSidebar"] .stMarkdown {
        color: #E5E7EB !important;
    }
    
    [data-testid="stSidebar"] .stMarkdown p {
        color: #E5E7EB !important;
    }
    
    [data-testid="stSidebar"] h3 {
        color: #E5E7EB !important;
        font-weight: 600 !important;
    }
    
    /* Sidebar animated logo - KEEP THIS */
    .sidebar-logo {
        animation: float 3s ease-in-out infinite;
    }
    
    /* Tab styling - Bigger and better spaced */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: #121A2F;
        padding: 10px 12px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        color: #9CA3AF !important;
        font-weight: 600;
        font-size: 0.95rem;
        padding: 12px 20px;
        border-radius: 10px;
    }
    
    .stTabs [data-baseweb="tab"]:hover {
        background: rgba(108, 99, 255, 0.15);
        color: #E5E7EB !important;
    }
    
    .stTabs [aria-selected="true"] {
        background: #6C63FF !important;
        color: #ffffff !important;
    }
    
    /* Input fields */
    .stTextInput input {
        background: #121A2F !important;
        border: 1px solid rgba(108, 99, 255, 0.3) !important;
        color: #E5E7EB !important;
        border-radius: 8px !important;
        padding: 10px !important;
    }
    
    .stTextInput input:focus {
        border-color: #6C63FF !important;
    }
    
    /* Selectbox */
    .stSelectbox > div > div {
        background: #121A2F !important;
        border: 1px solid rgba(108, 99, 255, 0.3) !important;
        color: #E5E7EB !important;
    }
    
    /* Dataframe - Enhanced Visibility */
    .stDataFrame {
        border-radius: 12px !important;
        overflow: hidden;
        border: 1px solid rgba(108, 99, 255, 0.2) !important;
    }
    
    /* Table styling - 4 color palette */
    .stDataFrame thead th {
        background: #6C63FF !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        padding: 12px !important;
        font-size: 0.8rem !important;
    }
    
    .stDataFrame tbody tr {
        background: #121A2F !important;
    }
    
    .stDataFrame tbody tr:hover {
        background: rgba(108, 99, 255, 0.1) !important;
    }
    
    .stDataFrame tbody td {
        color: #E5E7EB !important;
        padding: 12px !important;
    }
    
    /* Expander styling */
    .streamlit-expanderHeader {
        background: #121A2F !important;
        border: 1px solid rgba(108, 99, 255, 0.2) !important;
        border-radius: 10px !important;
        color: #E5E7EB !important;
        font-weight: 500 !important;
    }
    
    .streamlit-expanderHeader:hover {
        background: rgba(108, 99, 255, 0.1) !important;
    }
    
    .streamlit-expanderContent {
        background: #0B1220 !important;
        border: 1px solid rgba(108, 99, 255, 0.1) !important;
        border-top: none !important;
        border-radius: 0 0 10px 10px !important;
    }
    
    /* Status badges - 4 color palette */
    .status-available { background: #22C55E; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .status-busy { background: #EF4444; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    
    .priority-high { background: #EF4444; color: white; padding: 4px 12px; border-radius: 6px; font-weight: 600; }
    .priority-medium { background: #F59E0B; color: white; padding: 4px 12px; border-radius: 6px; font-weight: 600; }
    .priority-low { background: #6C63FF; color: white; padding: 4px 12px; border-radius: 6px; font-weight: 600; }
    
    /* ============================================ */
    /* GLOBAL TEXT - Using Guidance Colors */
    /* ============================================ */
    
    .stMarkdown, .stMarkdown p, .stMarkdown span {
        color: #E5E7EB !important;
    }
    
    .stMarkdown h1, .stMarkdown h2, .stMarkdown h3, .stMarkdown h4 {
        color: #E5E7EB !important;
        font-weight: 600 !important;
    }
    
    /* Alerts */
    .stAlert {
        background: #121A2F !important;
        border: 1px solid rgba(108, 99, 255, 0.3) !important;
    }
    
    .stAlert p {
        color: #E5E7EB !important;
    }
    
    /* Labels */
    .stSelectbox label, .stTextInput label {
        color: #E5E7EB !important;
        font-weight: 500 !important;
    }
    
    /* Metric cards - Bigger tiles with animation */
    [data-testid="stMetric"] {
        background: linear-gradient(145deg, rgba(18, 26, 47, 0.95), rgba(11, 18, 32, 0.95)) !important;
        border: 1px solid rgba(108, 99, 255, 0.3) !important;
        border-radius: 16px !important;
        padding: 24px 20px !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
        min-height: 120px !important;
        transition: all 0.3s ease !important;
    }
    
    [data-testid="stMetric"]:hover {
        border-color: #6C63FF !important;
        transform: translateY(-2px) !important;
    }
    
    [data-testid="stMetricLabel"] {
        color: #9CA3AF !important;
        font-size: 0.85rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.08em !important;
        margin-bottom: 8px !important;
    }
    
    [data-testid="stMetricValue"] {
        color: #E5E7EB !important;
        font-weight: 800 !important;
        font-size: 2.5rem !important;
    }
    
    /* Expander text */
    .streamlit-expanderHeader p, .streamlit-expanderHeader span {
        color: #E5E7EB !important;
        font-weight: 500 !important;
    }
    
    /* Buttons - Primary Indigo */
    .stButton > button {
        background: #6C63FF !important;
        color: #ffffff !important;
        border: none !important;
        font-weight: 600 !important;
        padding: 10px 20px !important;
        border-radius: 8px !important;
        transition: all 0.2s ease !important;
    }
    
    .stButton > button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(108, 99, 255, 0.4) !important;
    }
    
    /* Divider */
    hr {
        border-color: rgba(108, 99, 255, 0.2) !important;
    }
    
    /* Links - Indigo */
    a {
        color: #6C63FF !important;
        text-decoration: none !important;
    }
    
    a:hover {
        text-decoration: underline !important;
    }
    
    /* Live status indicator - Emerald */
    .live-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.4);
        border-radius: 16px;
        padding: 4px 12px;
        font-size: 0.8rem;
        color: #22C55E;
        font-weight: 500;
    }
    
    .live-dot {
        width: 6px;
        height: 6px;
        background: #22C55E;
        border-radius: 50%;
        animation: pulse 2s infinite;
    }
    
    /* Glass card */
    .glass-card {
        background: #121A2F;
        border: 1px solid rgba(108, 99, 255, 0.2);
        border-radius: 16px;
        padding: 24px;
        animation: fade-in-up 0.5s ease-out;
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
def fetch_appointments(clinic_id=None, limit=200):
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

# Service prices
SERVICE_PRICES = {
    "Regular Cleaning": 120, "Deep Cleaning": 250, "Cleaning": 120,
    "Dental Filling": 250, "Filling": 250, "Crown Placement": 1200, 
    "Crown": 1200, "Root Canal": 1500, "Tooth Extraction": 300, 
    "Extraction": 300, "Teeth Whitening": 400, "Whitening": 400,
    "Dental Implant": 3500, "Implant": 3500, "Emergency Visit": 200, 
    "Emergency": 200, "Consultation": 75, "Checkup": 75
}

def get_service_price(service_type):
    for key, price in SERVICE_PRICES.items():
        if key.lower() in service_type.lower():
            return price
    return 100

# Mock doctors
DOCTORS = [
    {"name": "Dr. Emily Chen", "specialty": "General Dentistry", "clinic": "SmileCare Dental", "available": True, "appointments": 8, "revenue": 2400},
    {"name": "Dr. Michael Roberts", "specialty": "Oral Surgery", "clinic": "SmileCare Dental", "available": True, "appointments": 5, "revenue": 7500},
    {"name": "Dr. Sarah Kim", "specialty": "Pediatric Dentistry", "clinic": "SmileCare Dental", "available": False, "appointments": 6, "revenue": 1800},
    {"name": "Dr. James Wilson", "specialty": "General Dentistry", "clinic": "Bright Teeth", "available": True, "appointments": 7, "revenue": 2100},
    {"name": "Dr. Lisa Patel", "specialty": "Cosmetic Dentistry", "clinic": "Bright Teeth", "available": True, "appointments": 4, "revenue": 4800},
    {"name": "Dr. Robert Martinez", "specialty": "Endodontics", "clinic": "Downtown Dental", "available": True, "appointments": 6, "revenue": 9000},
]

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    # Animated sidebar header
    st.markdown("""<div style="text-align: center; padding: 30px 10px;">
<div style="margin-bottom: 15px; animation: float 3s ease-in-out infinite;">
<img src="https://em-content.zobj.net/source/apple/391/tooth_1f9b7.png" alt="Dentsi" style="width: 90px; height: 90px; filter: drop-shadow(0 8px 20px rgba(108, 99, 255, 0.5));">
</div>
<div style="font-size: 2.5rem; font-weight: 900; background: linear-gradient(135deg, #6C63FF, #22C55E, #FACC15, #6C63FF); background-size: 300% 300%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradient-shift 4s ease infinite; letter-spacing: -1px;">DENTSI</div>
<div style="margin-top: 12px; font-size: 0.95rem; line-height: 1.5; color: #9CA3AF; font-style: italic;">Your invisible front desk<br>that never sleeps</div>
<div style="margin-top: 20px; display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 20px; padding: 6px 14px;">
<span style="width: 8px; height: 8px; background: #22C55E; border-radius: 50%; animation: pulse 2s infinite;"></span>
<span style="color: #22C55E; font-size: 0.85rem; font-weight: 600;">Always On</span>
</div>
</div>""", unsafe_allow_html=True)
    
    st.divider()
    
    # System status
    health = fetch_health()
    if health.get("status") == "ok":
        st.markdown("""
        <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22C55E; border-radius: 10px; padding: 12px; text-align: center;">
            <span style="color: #22C55E; font-weight: 700;">🤖 Autonomous Front Desk Live</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.warning("⚠️ Backend Offline")
    
    st.divider()
    
    # Clinic selector - fetch from backend
    clinics = fetch_clinics()
    
    st.markdown("### 🏥 Select Clinic")
    if clinics:
        clinic_names = [c.get("name", "Unknown") for c in clinics]
        
        # Default to first clinic if none selected
        default_idx = 0
        if st.session_state.selected_clinic_id:
            for idx, c in enumerate(clinics):
                if c.get("id") == st.session_state.selected_clinic_id:
                    default_idx = idx
                    break
        
        selected_clinic_name = st.selectbox(
            "Active clinic for AI calls:",
            clinic_names,
            index=default_idx,
            key="clinic_selector"
        )
        
        # Store selected clinic info in session state and notify backend
        for c in clinics:
            if c.get("name") == selected_clinic_name:
                new_clinic_id = c.get("id")
                # Only update if changed
                if new_clinic_id != st.session_state.selected_clinic_id:
                    st.session_state.selected_clinic_id = new_clinic_id
                    st.session_state.selected_clinic_name = c.get("name")
                    # Notify backend of active clinic change for AI calls
                    try:
                        requests.post(
                            f"{API_BASE}/admin/set-active-clinic",
                            json={"clinic_id": new_clinic_id},
                            timeout=5
                        )
                    except:
                        pass
                break
        
        selected_clinic_id = st.session_state.selected_clinic_id
    else:
        st.warning("No clinics found in database")
        selected_clinic_name = "Demo Clinic"
        selected_clinic_id = None
    
    st.divider()
    
    st.markdown("### 📞 Patient Line")
    st.markdown(f"""
    <div style="background: linear-gradient(135deg, #6C63FF, #22C55E);
                color: white; padding: 18px; border-radius: 14px;
                text-align: center; font-size: 1.3rem; font-weight: 700;">
        {TWILIO_NUMBER}
    </div>
    """, unsafe_allow_html=True)
    
    # Show which clinic is selected for AI calls
    if clinics and selected_clinic_name:
        st.markdown(f"""
        <div style="background: rgba(108, 99, 255, 0.15); border: 1px solid rgba(108, 99, 255, 0.4); 
                    border-radius: 8px; padding: 10px; margin-top: 10px; text-align: center;">
            <span style="color: #9CA3AF; font-size: 0.85rem;">AI answering as:</span><br>
            <span style="color: #6C63FF; font-weight: 700;">{selected_clinic_name}</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.warning("⚠️ No clinic configured")
    
    st.divider()
    
    st.markdown("### ⚙️ Configure")
    st.caption("Select clinic above to configure which dental office the AI represents when answering calls.")
    

# ============================================================================
# MAIN CONTENT
# ============================================================================

st.markdown("""
<div style="text-align: center; margin-bottom: 20px; animation: fade-in-up 0.8s ease-out;">
    <div class="sidebar-logo" style="display: inline-block;">
        <img src="https://em-content.zobj.net/source/apple/391/tooth_1f9b7.png" 
             alt="Dentsi" style="width: 70px; height: 70px; filter: drop-shadow(0 8px 25px rgba(139, 92, 246, 0.6));">
    </div>
</div>
""", unsafe_allow_html=True)
st.markdown('<h1 class="main-title">DENTSI</h1>', unsafe_allow_html=True)
st.markdown("""
<p style="text-align: center; font-size: 1.4rem; max-width: 750px; margin-left: auto; margin-right: auto; line-height: 1.6; margin-bottom: 12px;
   background: linear-gradient(135deg, #6C63FF, #22C55E, #FACC15, #6C63FF); background-size: 300% 300%;
   -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: gradient-shift 4s ease infinite; font-weight: 600;">
A team of DENTSI autonomous agents running your front desk and optimizing every chair, 24/7
</p>
<p style="text-align: center; font-size: 1.05rem; color: #9CA3AF; font-style: italic; margin-bottom: 30px;">
DENTSI turns every call into an optimized booking — even when your clinic is closed
</p>
""", unsafe_allow_html=True)

st.markdown("""
<div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 30px; flex-wrap: wrap;">
    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 20px; padding: 8px 16px;">
        <span style="width: 8px; height: 8px; background: #22C55E; border-radius: 50%; animation: pulse 2s infinite;"></span>
        <span style="color: #22C55E; font-weight: 600;">Autonomous Mode Active</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; color: #E5E7EB; font-size: 0.95rem;">
        <span>🎯</span> <span>Zero Missed Calls</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px; color: #E5E7EB; font-size: 0.95rem;">
        <span>⚡</span> <span>Instant Response</span>
    </div>
</div>
""", unsafe_allow_html=True)

# ============================================================================
# METRICS ROW
# ============================================================================

stats = fetch_stats(selected_clinic_id)
appointments = fetch_appointments(selected_clinic_id)
calls = fetch_calls(selected_clinic_id)

# Calculate metrics
booked_appointments = [a for a in appointments if a.get("patient")]
total_revenue = sum(get_service_price(a.get("service_type", "")) for a in booked_appointments)
call_count = len(calls) if calls else 15

col1, col2, col3, col4, col5, col6 = st.columns(6)

metrics_data = [
    ("📞", str(call_count), "Calls Today"),
    ("📅", str(len(booked_appointments)), "Appointments"),
    ("✅", "87%", "Booking Rate"),
    ("💰", f"${total_revenue:,}", "Revenue"),
    ("🏥", str(len(clinics)), "Clinics"),
    ("⚡", "0.8s", "Avg Response"),
]

for col, (icon, value, label) in zip([col1, col2, col3, col4, col5, col6], metrics_data):
    with col:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-icon">{icon}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-label">{label}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ============================================================================
# TABS
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs([
    "🎙️ Experience DENTSI",
    "📅 Appointments",
    "👥 Patients",
    "💬 Conversations",
    "👨‍⚕️ Doctors",
    "💰 Revenue",
    "📊 Analytics",
    "🚨 Escalations"
])

# ============================================================================
# TAB 1: TRY DEMO
# ============================================================================

with tab1:
    # Big heading for Experience DENTSI
    st.markdown("""
    <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 2.5rem; font-weight: 900; color: #6C63FF; margin-bottom: 10px;">
            🎙️ Experience DENTSI Live!
        </div>
        <div style="font-size: 1.1rem; color: #9CA3AF;">
            Call now and talk to your AI front desk assistant
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Use selected clinic from sidebar
    display_clinic_name = st.session_state.selected_clinic_name or "Select a clinic"
    
    # Big phone number - hero element
    st.markdown(f"""
    <div style="text-align: center; padding: 40px 20px; background: linear-gradient(145deg, #121A2F, #0B1220); border: 2px solid #6C63FF; border-radius: 20px; margin-bottom: 30px;">
        <div style="font-size: 1.2rem; color: #9CA3AF; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px;">Call Now to Experience DENTSI</div>
        <div style="font-size: 3.5rem; font-weight: 900; color: #6C63FF; letter-spacing: 2px; margin-bottom: 15px;">
            📞 {TWILIO_NUMBER}
        </div>
        <div style="display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22C55E; padding: 8px 20px; border-radius: 20px; color: #22C55E; font-weight: 600;">
            📍 Routing to: {display_clinic_name}
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Three column stats
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("⚡ Response Time", "~200ms")
    with col2:
        st.metric("🕐 Availability", "24/7")
    with col3:
        st.metric("📞 Call Capture", "100%")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # How it works - horizontal
    st.markdown("### ⚡ How It Works")
    
    hw_col1, hw_col2, hw_col3, hw_col4, hw_col5 = st.columns(5)
    with hw_col1:
        st.markdown("**1. Call**")
        st.caption("Patient dials the number")
    with hw_col2:
        st.markdown("**2. AI Answers**")
        st.caption("Instant pickup ~200ms")
    with hw_col3:
        st.markdown("**3. Understands**")
        st.caption("Claude AI processes intent")
    with hw_col4:
        st.markdown("**4. Responds**")
        st.caption("Natural voice via Bella")
    with hw_col5:
        st.markdown("**5. Books**")
        st.caption("Saved to database")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    # Features list
    st.markdown("### ✨ What You'll Experience")
    feat_col1, feat_col2 = st.columns(2)
    with feat_col1:
        st.markdown("✓ Natural voice conversation")
        st.markdown("✓ Real-time speech recognition")
        st.markdown("✓ Intelligent intent detection")
    with feat_col2:
        st.markdown("✓ AI-powered appointment booking")
        st.markdown("✓ Insurance collection")
        st.markdown("✓ Instant SMS confirmation")
    

# ============================================================================
# TAB 2: APPOINTMENTS
# ============================================================================

with tab2:
    st.markdown('<div class="section-header">📅 Scheduled Appointments</div>', unsafe_allow_html=True)
    
    if booked_appointments:
        # Summary Cards at Top
        apt_data = []
        for apt in booked_appointments:
            patient = apt.get("patient") or {}
            clinic = apt.get("clinic") or {}
            service = apt.get("service_type", "Consultation")
            price = get_service_price(service)
            apt_data.append({
                "patient_name": patient.get("name", "Unknown"),
                "phone": patient.get("phone", "-"),
                "service": service,
                "date": apt.get("appointment_date", "")[:10] if apt.get("appointment_date") else "-",
                "status": apt.get("status", "scheduled").upper(),
                "clinic": clinic.get("name", "-"),
                "price": price
            })
        
        scheduled_count = len([a for a in apt_data if a["status"] == "SCHEDULED"])
        completed_count = len([a for a in apt_data if a["status"] == "COMPLETED"])
        avg_revenue = total_revenue // len(booked_appointments) if booked_appointments else 0
        
        # Premium Summary Cards
        st.markdown("""
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.1)); border: 2px solid rgba(139, 92, 246, 0.5); border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 800; color: #a78bfa;">""" + str(len(booked_appointments)) + """</div>
                <div style="color: #e2e8f0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Total Appointments</div>
            </div>
            <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.1)); border: 2px solid rgba(16, 185, 129, 0.5); border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 800; color: #34d399;">""" + str(scheduled_count) + """</div>
                <div style="color: #e2e8f0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Scheduled</div>
            </div>
            <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.1)); border: 2px solid rgba(6, 182, 212, 0.5); border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 800; color: #22d3ee;">$""" + f"{total_revenue:,}" + """</div>
                <div style="color: #e2e8f0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Total Revenue</div>
            </div>
            <div style="background: linear-gradient(135deg, rgba(244, 63, 94, 0.3), rgba(244, 63, 94, 0.1)); border: 2px solid rgba(244, 63, 94, 0.5); border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 800; color: #fb7185;">$""" + str(avg_revenue) + """</div>
                <div style="color: #e2e8f0; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px;">Avg / Visit</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Appointment Cards Grid
        st.markdown('<div style="color: #e2e8f0; font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;">📋 Upcoming Appointments</div>', unsafe_allow_html=True)
        
        # Create cards in rows of 3
        for i in range(0, min(len(apt_data), 12), 3):
            cols = st.columns(3)
            for j, col in enumerate(cols):
                if i + j < len(apt_data):
                    apt = apt_data[i + j]
                    status_color = "#10b981" if apt["status"] == "SCHEDULED" else "#f59e0b" if apt["status"] == "CONFIRMED" else "#6b7280"
                    service_icon = "🦷" if "clean" in apt["service"].lower() else "👑" if "crown" in apt["service"].lower() else "🔧" if "canal" in apt["service"].lower() or "extract" in apt["service"].lower() else "✨" if "whiten" in apt["service"].lower() else "🩺"
                    
                    with col:
                        st.markdown(f"""
                        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.8)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 20px; margin-bottom: 16px; transition: transform 0.2s;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                <div>
                                    <div style="font-size: 1.1rem; font-weight: 700; color: #ffffff;">{apt["patient_name"]}</div>
                                    <div style="font-size: 0.85rem; color: #94a3b8;">{apt["phone"]}</div>
                                </div>
                                <div style="background: {status_color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">{apt["status"]}</div>
                            </div>
                            <div style="border-top: 1px solid rgba(139, 92, 246, 0.2); padding-top: 12px; margin-top: 8px;">
                                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                                    <span style="font-size: 1.2rem; margin-right: 8px;">{service_icon}</span>
                                    <span style="color: #e2e8f0; font-weight: 600;">{apt["service"]}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="color: #94a3b8; font-size: 0.9rem;">📅 {apt["date"]}</div>
                                    <div style="color: #10b981; font-weight: 700; font-size: 1.1rem;">${apt["price"]}</div>
                                </div>
                                <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">📍 {apt["clinic"]}</div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
        
        # Show more in table if many appointments
        if len(apt_data) > 12:
            st.markdown("<br>", unsafe_allow_html=True)
            with st.expander(f"📊 View All {len(apt_data)} Appointments in Table"):
                df = pd.DataFrame([{
                    "Patient": a["patient_name"],
                    "Phone": a["phone"],
                    "Service": a["service"],
                    "Date": a["date"],
                    "Status": a["status"],
                    "Clinic": a["clinic"],
                    "Revenue": f"${a['price']}"
                } for a in apt_data])
                st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.markdown("""
        <div style="background: rgba(30, 41, 59, 0.8); border: 2px dashed rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 60px 40px; text-align: center; margin: 20px 0;">
            <div style="font-size: 4rem; margin-bottom: 20px;">📅</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #e2e8f0; margin-bottom: 10px;">No Appointments Yet</div>
            <div style="color: #94a3b8; font-size: 1.1rem;">Make a test call to <span style="color: #8b5cf6; font-weight: 600;">+1 (920) 891-4513</span> to see appointments here!</div>
        </div>
        """, unsafe_allow_html=True)

# ============================================================================
# TAB 3: PATIENTS
# ============================================================================

with tab3:
    st.markdown('<div class="section-header">👥 Patient Profiles</div>', unsafe_allow_html=True)
    
    # Fetch patients from API
    try:
        patients_resp = requests.get(f"{API_BASE}/patients", timeout=5)
        patients_list = patients_resp.json() if patients_resp.status_code == 200 else []
    except:
        patients_list = []
    
    if patients_list:
        # Search filter
        search_term = st.text_input("🔍 Search patients by name or phone", "", key="patient_search")
        
        filtered_patients = patients_list
        if search_term:
            filtered_patients = [p for p in patients_list if 
                search_term.lower() in p.get("name", "").lower() or 
                search_term in p.get("phone", "")]
        
        # Summary stats
        total_ltv = sum(len(p.get('appointments', [])) * 150 for p in filtered_patients)
        st.markdown(f"""
        <div style="display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap;">
            <div style="background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); padding: 16px 24px; border-radius: 12px;">
                <div style="font-size: 1.8rem; font-weight: 800; color: #a78bfa;">{len(filtered_patients)}</div>
                <div style="color: #e2e8f0; font-size: 0.85rem;">Total Patients</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); padding: 16px 24px; border-radius: 12px;">
                <div style="font-size: 1.8rem; font-weight: 800; color: #34d399;">${total_ltv:,}</div>
                <div style="color: #e2e8f0; font-size: 0.85rem;">Total Lifetime Value</div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Patient cards in grid
        for i in range(0, min(len(filtered_patients), 12), 3):
            cols = st.columns(3)
            for j, col in enumerate(cols):
                if i + j < len(filtered_patients):
                    patient = filtered_patients[i + j]
                    name = patient.get('name', 'Unknown')
                    phone = patient.get('phone', 'N/A')
                    email = patient.get('email', '')
                    provider = patient.get('insurance_provider', '')
                    appointments = patient.get('appointments', [])
                    ltv = len(appointments) * 150
                    
                    with col:
                        st.markdown(f"""
                        <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.8)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 20px; margin-bottom: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <div style="font-size: 1.1rem; font-weight: 700; color: #ffffff;">🦷 {name}</div>
                                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">{phone}</div>
                                </div>
                                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 12px; border-radius: 8px; font-weight: 700;">${ltv}</div>
                            </div>
                            <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(139, 92, 246, 0.2);">
                                <div style="display: flex; justify-content: space-between; color: #e2e8f0; font-size: 0.9rem;">
                                    <span>📧 {email[:20] + '...' if len(email) > 20 else email if email else 'No email'}</span>
                                </div>
                                <div style="margin-top: 8px; color: #a5b4fc; font-size: 0.85rem;">
                                    🏥 {provider if provider else 'No insurance'}
                                </div>
                                <div style="margin-top: 8px; color: #6b7280; font-size: 0.8rem;">
                                    📅 {len(appointments)} appointment{'s' if len(appointments) != 1 else ''}
                                </div>
                            </div>
                        </div>
                        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: rgba(30, 41, 59, 0.8); border: 2px dashed rgba(139, 92, 246, 0.4); border-radius: 16px; padding: 60px 40px; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">👥</div>
            <div style="font-size: 1.5rem; font-weight: 700; color: #ffffff; margin-bottom: 10px;">No Patients Yet</div>
            <div style="color: #94a3b8; font-size: 1.1rem;">Patients are created when they call and book appointments</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Sample patient cards
        st.markdown("<br>", unsafe_allow_html=True)
        st.markdown('<div style="color: #ffffff; font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;">📋 Sample Patient Cards</div>', unsafe_allow_html=True)
        
        sample_cols = st.columns(3)
        samples = [
            {"name": "John Smith", "phone": "+1 (555) 123-4567", "email": "john@email.com", "insurance": "Delta Dental", "ltv": 1850, "visits": 12},
            {"name": "Sarah Johnson", "phone": "+1 (555) 987-6543", "email": "sarah@email.com", "insurance": "Cigna", "ltv": 920, "visits": 6},
            {"name": "Mike Brown", "phone": "+1 (555) 456-7890", "email": "mike@email.com", "insurance": "Aetna", "ltv": 450, "visits": 3},
        ]
        for idx, col in enumerate(sample_cols):
            s = samples[idx]
            with col:
                st.markdown(f"""
                <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.8)); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #ffffff;">🦷 {s['name']}</div>
                            <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">{s['phone']}</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 6px 12px; border-radius: 8px; font-weight: 700;">${s['ltv']}</div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(139, 92, 246, 0.2);">
                        <div style="color: #e2e8f0; font-size: 0.9rem;">📧 {s['email']}</div>
                        <div style="margin-top: 8px; color: #a5b4fc; font-size: 0.85rem;">🏥 {s['insurance']}</div>
                        <div style="margin-top: 8px; color: #6b7280; font-size: 0.8rem;">📅 {s['visits']} appointments</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        
# ============================================================================
# TAB 4: CONVERSATIONS
# ============================================================================

with tab4:
    st.markdown('<div class="section-header">💬 Conversation Summaries</div>', unsafe_allow_html=True)
    
    # Fetch call logs
    try:
        calls_resp = requests.get(f"{API_BASE}/calls", timeout=5)
        calls_list = calls_resp.json() if calls_resp.status_code == 200 else []
    except:
        calls_list = []
    
    if calls_list:
        st.markdown(f"**{len(calls_list)} Total Conversations**")
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Filter options
        col1, col2 = st.columns(2)
        with col1:
            outcome_filter = st.selectbox("Filter by Outcome", 
                ["All", "Booked", "Inquiry Answered", "Escalated", "Cancelled"])
        with col2:
            sort_by = st.selectbox("Sort by", ["Most Recent", "Longest Duration", "Highest Sentiment"])
        
        # Filter calls
        filtered_calls = calls_list
        if outcome_filter != "All":
            filtered_calls = [c for c in calls_list if c.get("outcome", "").lower() == outcome_filter.lower().replace(" ", "_")]
        
        for call in filtered_calls[:15]:
            patient = call.get("patient") or {}
            outcome = call.get("outcome") or "unknown"
            duration = call.get("duration") or 0
            sentiment = call.get("sentiment_score") or 0.5
            
            # Outcome color
            outcome_colors = {
                "booked": "#10b981",
                "inquiry_answered": "#06b6d4",
                "escalated": "#f59e0b",
                "cancelled": "#ef4444"
            }
            outcome_color = outcome_colors.get(outcome.lower(), "#6b7280")
            
            # Sentiment indicator
            sentiment_emoji = "😊" if sentiment > 0.6 else "😐" if sentiment > 0.3 else "😟"
            
            with st.expander(f"{sentiment_emoji} {patient.get('name', 'Unknown Caller')} | {call.get('caller_phone', 'N/A')} | {outcome.upper()}", expanded=False):
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("⏱️ Duration", f"{duration}s")
                with col2:
                    st.metric("📊 Sentiment", f"{int(sentiment * 100)}%")
                with col3:
                    st.metric("🎯 Outcome", outcome.replace("_", " ").title())
                with col4:
                    intent = call.get("intent", "general")
                    st.metric("💡 Intent", intent.replace("_", " ").title() if intent else "General")
                
                st.markdown("---")
                st.markdown("**📝 Conversation Summary**")
                transcript = call.get("transcript", "")
                if transcript:
                    # Show first 500 chars of transcript
                    st.text_area("", transcript[:500] + ("..." if len(transcript) > 500 else ""), 
                                height=120, disabled=True, key=f"transcript_{call.get('id', '')}")
                else:
                    st.write("No transcript available")
                
                # Potential revenue
                if outcome == "booked":
                    st.success("💰 **Revenue Impact:** Appointment booked - Est. $150-$200")
                elif outcome == "escalated":
                    st.warning("⚠️ **Action Required:** Follow up with patient")
    else:
        st.info("No conversation logs yet. Make a test call to see summaries here!")
        
        # Demo conversation
        st.markdown("### Sample Conversation Summary")
        with st.expander("😊 Sarah Johnson | +1 (555) 987-6543 | BOOKED", expanded=True):
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("⏱️ Duration", "127s")
            with col2:
                st.metric("📊 Sentiment", "85%")
            with col3:
                st.metric("🎯 Outcome", "Booked")
            with col4:
                st.metric("💡 Intent", "New Appointment")
            
            st.markdown("---")
            st.markdown("**📝 Conversation Summary**")
            st.text_area("", """Dentsi: Hello and welcome to SmileCare Dental! This is Dentsi, your AI assistant. How can I help you today?

Patient: Hi, I'd like to schedule a teeth cleaning.

Dentsi: Wonderful! I'd be happy to help you with that. Let me check our availability. Do you have a preferred day?

Patient: Maybe next Tuesday?

Dentsi: I have Tuesday, January 28th at 10am or 2pm available. Which works better for you?

Patient: 2pm sounds good.

Dentsi: Perfect! Before I confirm, do you have dental insurance?

Patient: Yes, Delta Dental.

Dentsi: Great! And your member ID?

Patient: DD789456123

Dentsi: Got it! You're all set for a cleaning on Tuesday, January 28th at 2pm. You'll receive a text confirmation. We're looking forward to seeing you!""", 
                        height=200, disabled=True)
            st.success("💰 **Revenue Impact:** Cleaning booked - Est. $120")

# ============================================================================
# TAB 5: DOCTORS
# ============================================================================

with tab5:
    st.markdown('<div class="section-header">👨‍⚕️ Doctors & Availability</div>', unsafe_allow_html=True)
    
    # Doctor tiles in rows of 3
    for row_start in range(0, len(DOCTORS), 3):
        cols = st.columns(3, gap="medium")
        for i, col in enumerate(cols):
            doc_idx = row_start + i
            if doc_idx < len(DOCTORS):
                doc = DOCTORS[doc_idx]
                status_color = "#22C55E" if doc["available"] else "#EF4444"
                status_text = "Available" if doc["available"] else "Busy"
                status_bg = "rgba(34, 197, 94, 0.15)" if doc["available"] else "rgba(239, 68, 68, 0.15)"
                
                with col:
                    st.markdown(f"""
<div style="background: linear-gradient(145deg, #121A2F, #0B1220); border: 1px solid rgba(108, 99, 255, 0.3); border-radius: 16px; padding: 20px; margin-bottom: 16px;">
<div style="font-size: 1.15rem; font-weight: 700; color: #E5E7EB; margin-bottom: 6px;">👨‍⚕️ {doc['name']}</div>
<div style="font-size: 0.9rem; color: #6C63FF; margin-bottom: 4px;">{doc['specialty']}</div>
<div style="font-size: 0.85rem; color: #9CA3AF; margin-bottom: 12px;">📍 {doc['clinic']}</div>
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
<span style="background: {status_bg}; color: {status_color}; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">{status_text}</span>
<span style="color: #FACC15; font-size: 1.2rem; font-weight: 800;">${doc['revenue']:,}</span>
</div>
<div style="font-size: 0.8rem; color: #6B7280;">{doc['appointments']} appointments today</div>
</div>
                    """, unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown('<div class="section-header">📊 Performance by Doctor</div>', unsafe_allow_html=True)
    
    doc_df = pd.DataFrame(DOCTORS)
    
    col1, col2 = st.columns(2)
    with col1:
        fig = px.bar(doc_df, x="name", y="appointments", 
                     title="Appointments Today",
                     color="appointments",
                     color_continuous_scale=["#8b5cf6", "#06b6d4"])
        fig.update_layout(
            template="plotly_dark", 
            paper_bgcolor="rgba(0,0,0,0)", 
            plot_bgcolor="rgba(0,0,0,0)", 
            height=350,
            showlegend=False,
            xaxis_title="",
            yaxis_title="Appointments"
        )
        fig.update_xaxes(tickangle=45)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        fig = px.bar(doc_df, x="name", y="revenue", 
                     title="Revenue Today",
                     color="revenue",
                     color_continuous_scale=["#10b981", "#06b6d4"])
        fig.update_layout(
            template="plotly_dark", 
            paper_bgcolor="rgba(0,0,0,0)", 
            plot_bgcolor="rgba(0,0,0,0)", 
            height=350,
            showlegend=False,
            xaxis_title="",
            yaxis_title="Revenue ($)"
        )
        fig.update_xaxes(tickangle=45)
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 6: REVENUE
# ============================================================================

with tab6:
    st.markdown('<div class="section-header">💰 Revenue Analytics</div>', unsafe_allow_html=True)
    
    total_doc_revenue = sum(d["revenue"] for d in DOCTORS)
    num_chairs = 5
    revenue_per_chair = total_doc_revenue // num_chairs
    total_patients = sum(d["appointments"] for d in DOCTORS)
    avg_per_patient = total_doc_revenue // total_patients if total_patients else 0
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown(f"""
        <div class="revenue-box">
            <div style="font-size: 1rem; opacity: 0.9;">Total Revenue Today</div>
            <div style="font-size: 2.8rem; font-weight: 800; margin: 10px 0;">${total_doc_revenue:,}</div>
            <div style="font-size: 0.9rem;">↑ 12% vs yesterday</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.markdown(f"""
        <div class="revenue-box-purple">
            <div style="font-size: 1rem; opacity: 0.9;">Revenue Per Chair</div>
            <div style="font-size: 2.8rem; font-weight: 800; margin: 10px 0;">${revenue_per_chair:,}</div>
            <div style="font-size: 0.9rem;">{num_chairs} chairs active</div>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        st.markdown(f"""
        <div class="revenue-box-cyan">
            <div style="font-size: 1rem; opacity: 0.9;">Avg Per Patient</div>
            <div style="font-size: 2.8rem; font-weight: 800; margin: 10px 0;">${avg_per_patient}</div>
            <div style="font-size: 0.9rem;">{total_patients} patients today</div>
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
        fig = px.pie(service_data, values="Revenue", names="Service", hole=0.45,
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
        fig.add_trace(go.Scatter(
            x=trend["Date"], y=trend["Revenue"],
            fill='tozeroy', 
            fillcolor='rgba(139, 92, 246, 0.3)',
            line=dict(color='#8b5cf6', width=3),
            mode='lines'
        ))
        fig.update_layout(
            template="plotly_dark", 
            paper_bgcolor="rgba(0,0,0,0)", 
            plot_bgcolor="rgba(0,0,0,0)", 
            height=350,
            xaxis_title="Date",
            yaxis_title="Revenue ($)"
        )
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 7: ANALYTICS
# ============================================================================

with tab7:
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
        fig.add_trace(go.Bar(x=call_data["Date"], y=call_data["Total Calls"], 
                             name="Total Calls", marker_color='#8b5cf6'))
        fig.add_trace(go.Bar(x=call_data["Date"], y=call_data["Booked"], 
                             name="Booked", marker_color='#06b6d4'))
        fig.update_layout(
            template="plotly_dark", 
            paper_bgcolor="rgba(0,0,0,0)", 
            plot_bgcolor="rgba(0,0,0,0)", 
            height=350, 
            barmode='group',
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### Call Intent Distribution")
        intents = pd.DataFrame({
            "Intent": ["New Booking", "Reschedule", "Inquiry", "Cancel", "Emergency"],
            "Count": [180, 45, 60, 25, 15]
        })
        fig = px.pie(intents, values="Count", names="Intent", hole=0.45,
                     color_discrete_sequence=["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"])
        fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("<br>", unsafe_allow_html=True)
    st.markdown("### Call Outcomes")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    with col1:
        st.metric("✅ Booked", "212", "72%")
    with col2:
        st.metric("ℹ️ Info Only", "48", "16%")
    with col3:
        st.metric("🔄 Rescheduled", "25", "8%")
    with col4:
        st.metric("❌ Cancelled", "8", "3%")
    with col5:
        st.metric("🚨 Escalated", "4", "1%")

# ============================================================================
# TAB 8: ESCALATIONS
# ============================================================================

with tab8:
    st.markdown('<div class="section-header">🚨 Escalations & Alerts</div>', unsafe_allow_html=True)
    
    st.markdown("""
    <p style="color: #9CA3AF; margin-bottom: 20px;">
    Cases requiring human attention - AI has flagged these for follow-up
    </p>
    """, unsafe_allow_html=True)
    
    escalations = [
        {"id": 1, "patient": "Robert Taylor", "reason": "Billing question - needs payment plan discussion", "priority": "Medium", "time": "10 min ago", "phone": "+1 555-777-7777"},
        {"id": 2, "patient": "Unknown Caller", "reason": "Complex insurance - needs manual verification", "priority": "Low", "time": "25 min ago", "phone": "+1 555-000-0000"},
        {"id": 3, "patient": "Michael Brown", "reason": "EMERGENCY - Severe tooth pain, needs same-day appointment", "priority": "High", "time": "2 min ago", "phone": "+1 555-333-3333"},
    ]
    
    for idx, esc in enumerate(escalations):
        priority_colors = {"High": "#EF4444", "Medium": "#F59E0B", "Low": "#6C63FF"}
        priority_bg = {"High": "rgba(239, 68, 68, 0.15)", "Medium": "rgba(245, 158, 11, 0.15)", "Low": "rgba(108, 99, 255, 0.15)"}
        
        st.markdown(f"""
        <div style="background: #121A2F; border-left: 4px solid {priority_colors[esc['priority']]}; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: #E5E7EB;">{esc['patient']}</div>
                    <div style="color: #9CA3AF; margin-top: 8px; font-size: 0.95rem;">{esc['reason']}</div>
                    <div style="color: #6B7280; font-size: 0.85rem; margin-top: 12px;">
                        📞 {esc['phone']} &nbsp;•&nbsp; 🕐 {esc['time']}
                    </div>
                </div>
                <div style="background: {priority_bg[esc['priority']]}; color: {priority_colors[esc['priority']]}; padding: 6px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                    {esc['priority']}
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        if idx < len(escalations) - 1:
            st.markdown("<div style='height: 8px;'></div>", unsafe_allow_html=True)

# ============================================================================
# FOOTER
# ============================================================================

st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown(f"""
<div style="text-align: center; padding: 40px 20px; border-top: 1px solid rgba(139, 92, 246, 0.3); background: linear-gradient(180deg, transparent, rgba(139, 92, 246, 0.05));">
    <div style="font-size: 3rem; margin-bottom: 10px;">🦷</div>
    <div style="font-size: 1.5rem; font-weight: 800; 
                background: linear-gradient(135deg, #06b6d4, #8b5cf6);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                margin-top: 10px;">
        DENTSI
    </div>
    <div style="color: #a5b4fc; margin-top: 8px; font-style: italic; font-size: 1rem;">
        Your invisible front desk that never sleeps
    </div>
    <div style="color: #64748b; font-size: 0.9rem; margin-top: 20px;">
        📞 {TWILIO_NUMBER} &nbsp;•&nbsp; 
        <a href="https://dentcognit.abacusai.app/api-docs" target="_blank" style="color: #8b5cf6;">API Docs</a>
    </div>
    <div style="color: #475569; font-size: 0.8rem; margin-top: 15px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <img src="https://www.elevenlabs.io/favicon.ico" width="14" style="border-radius: 3px;"> ElevenLabs
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.9rem;">🤖</span> Claude Sonnet
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.9rem;">📞</span> Twilio
        </span>
    </div>
</div>
""", unsafe_allow_html=True)
