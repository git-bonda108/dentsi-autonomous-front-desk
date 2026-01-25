"""
🦷 DENTRA AI Voice Agent - Enterprise Demo Dashboard
A stunning Streamlit app showcasing AI-powered dental clinic automation

Run with: streamlit run dentra_app.py
"""

import streamlit as st
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import random
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE = "https://dentcognit.abacusai.app"

st.set_page_config(
    page_title="DENTRA - AI Voice Agent for Dental Clinics",
    page_icon="🦷",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# CUSTOM CSS - Premium Styling
# ============================================================================

st.markdown("""
<style>
    /* Main background */
    .stApp {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    }
    
    /* Hide default Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Header styling */
    .main-header {
        font-size: 3rem;
        font-weight: 800;
        background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-align: center;
        margin-bottom: 0;
        padding: 20px 0;
    }
    
    .sub-header {
        color: #94a3b8;
        font-size: 1.2rem;
        text-align: center;
        margin-top: 0;
        margin-bottom: 30px;
    }
    
    /* Metric cards */
    .metric-card {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
        border: 1px solid rgba(99, 102, 241, 0.3);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        transition: all 0.3s ease;
    }
    
    .metric-card:hover {
        transform: translateY(-4px);
        border-color: rgba(99, 102, 241, 0.6);
        box-shadow: 0 20px 40px rgba(99, 102, 241, 0.2);
    }
    
    .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .metric-label {
        color: #94a3b8;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-top: 8px;
    }
    
    .metric-delta {
        color: #34d399;
        font-size: 0.85rem;
        margin-top: 4px;
    }
    
    /* Agent cards */
    .agent-card {
        background: rgba(30, 41, 59, 0.8);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 12px;
        padding: 20px;
        margin: 10px 0;
        transition: all 0.3s ease;
    }
    
    .agent-card:hover {
        border-color: rgba(99, 102, 241, 0.5);
        transform: scale(1.02);
    }
    
    .agent-icon {
        font-size: 2rem;
        margin-bottom: 10px;
    }
    
    .agent-name {
        color: #f1f5f9;
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
    }
    
    .agent-desc {
        color: #94a3b8;
        font-size: 0.85rem;
    }
    
    /* Status badges */
    .badge-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .badge-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    .badge-danger {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 6px 16px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    
    /* Feature cards */
    .feature-card {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 16px;
        padding: 24px;
        height: 100%;
    }
    
    .feature-icon {
        font-size: 2.5rem;
        margin-bottom: 16px;
    }
    
    .feature-title {
        color: #f1f5f9;
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 12px;
    }
    
    .feature-text {
        color: #94a3b8;
        font-size: 0.9rem;
        line-height: 1.6;
    }
    
    /* Conversation demo */
    .chat-bubble-user {
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 16px 16px 4px 16px;
        padding: 16px;
        margin: 12px 0;
        margin-left: 40px;
        color: #e2e8f0;
    }
    
    .chat-bubble-ai {
        background: rgba(139, 92, 246, 0.2);
        border: 1px solid rgba(139, 92, 246, 0.4);
        border-radius: 16px 16px 16px 4px;
        padding: 16px;
        margin: 12px 0;
        margin-right: 40px;
        color: #e2e8f0;
    }
    
    .chat-label {
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 1px;
    }
    
    /* Tabs styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: rgba(30, 41, 59, 0.5);
        padding: 8px;
        border-radius: 12px;
    }
    
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        color: #94a3b8;
        border-radius: 8px;
        padding: 12px 24px;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
    }
    
    /* Section headers */
    .section-header {
        color: #f1f5f9;
        font-size: 1.5rem;
        font-weight: 600;
        margin: 30px 0 20px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid rgba(99, 102, 241, 0.3);
    }
    
    /* Sidebar */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
        border-right: 1px solid rgba(99, 102, 241, 0.2);
    }
    
    /* Dataframe styling */
    .stDataFrame {
        border-radius: 12px;
        overflow: hidden;
    }
    
    /* Progress bars */
    .stProgress > div > div {
        background: linear-gradient(90deg, #6366f1 0%, #a78bfa 100%);
    }
    
    /* Dividers */
    hr {
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);
        margin: 30px 0;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# MOCK DATA GENERATORS
# ============================================================================

def generate_call_data(days=30):
    """Generate realistic call data for charts"""
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    data = {
        'date': dates,
        'total_calls': [random.randint(25, 60) for _ in range(days)],
        'booked': [random.randint(15, 40) for _ in range(days)],
        'inquiries': [random.randint(5, 15) for _ in range(days)],
        'emergencies': [random.randint(1, 5) for _ in range(days)],
        'escalated': [random.randint(1, 4) for _ in range(days)],
    }
    return pd.DataFrame(data)

def generate_revenue_data():
    """Generate revenue by service type"""
    services = ['Implants', 'Crowns', 'Root Canals', 'Cleanings', 'Fillings', 'Extractions', 'Whitening']
    revenue = [45000, 32000, 28000, 18000, 15000, 12000, 8000]
    appointments = [9, 22, 19, 120, 60, 40, 35]
    return pd.DataFrame({'service': services, 'revenue': revenue, 'appointments': appointments})

def generate_hourly_calls():
    """Generate call distribution by hour"""
    hours = list(range(8, 20))
    calls = [12, 28, 45, 52, 48, 35, 42, 55, 48, 32, 18, 8]
    return pd.DataFrame({'hour': hours, 'calls': calls})

def generate_patient_data():
    """Generate patient statistics"""
    return {
        'total': 1250,
        'new_this_month': 87,
        'returning': 1163,
        'with_insurance': 892,
        'overdue_cleaning': 156
    }

# ============================================================================
# API FUNCTIONS
# ============================================================================

@st.cache_data(ttl=60)
def get_api_health():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=10)
        return r.json()
    except:
        return {"status": "offline"}

@st.cache_data(ttl=60)
def get_clinics():
    try:
        r = requests.get(f"{API_BASE}/clinics", timeout=10)
        return r.json()
    except:
        return []

@st.cache_data(ttl=60)
def get_dashboard_stats(clinic_id=None):
    try:
        url = f"{API_BASE}/api/dashboard/stats"
        if clinic_id:
            url += f"?clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", {})
    except:
        return {}

@st.cache_data(ttl=60)
def get_appointments(clinic_id=None, limit=50):
    try:
        url = f"{API_BASE}/api/dashboard/appointments?limit={limit}"
        if clinic_id:
            url += f"&clinicId={clinic_id}"
        r = requests.get(url, timeout=10)
        return r.json().get("data", [])
    except:
        return []

# ============================================================================
# SIDEBAR
# ============================================================================

with st.sidebar:
    # Logo and title
    st.markdown("""
    <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 4rem;">🦷</div>
        <div style="font-size: 1.8rem; font-weight: 700; 
                    background: linear-gradient(135deg, #60a5fa, #a78bfa);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            DENTRA
        </div>
        <div style="color: #64748b; font-size: 0.9rem; margin-top: 5px;">
            AI Voice Agent
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    st.divider()
    
    # Mode toggle
    demo_mode = st.toggle("🎮 Demo Mode", value=True, help="Toggle between demo data and live API")
    
    st.divider()
    
    # Clinic selector
    clinics = get_clinics()
    clinic_options = {"🏥 All Clinics": None}
    for c in clinics:
        clinic_options[f"🏥 {c['name']}"] = c["id"]
    
    selected_clinic_name = st.selectbox(
        "Select Clinic",
        options=list(clinic_options.keys()),
        index=0
    )
    selected_clinic_id = clinic_options[selected_clinic_name]
    
    st.divider()
    
    # System status
    health = get_api_health()
    if health.get("status") == "ok":
        st.markdown("""
        <div style="background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4);
                    border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 1.5rem;">✅</div>
            <div style="color: #34d399; font-weight: 600; margin-top: 8px;">System Online</div>
            <div style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">All services operational</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4);
                    border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 1.5rem;">⚠️</div>
            <div style="color: #f87171; font-weight: 600; margin-top: 8px;">Demo Mode</div>
            <div style="color: #64748b; font-size: 0.8rem; margin-top: 4px;">Using simulated data</div>
        </div>
        """, unsafe_allow_html=True)
    
    st.divider()
    
    # Quick links
    st.markdown("### 🔗 Quick Links")
    st.markdown(f"[📄 API Documentation]({API_BASE}/api-docs)")
    st.markdown(f"[❤️ Health Check]({API_BASE}/health)")
    st.markdown("[📊 Swagger UI]({}/api-docs)".format(API_BASE))
    
    st.divider()
    
    # Version info
    st.markdown("""
    <div style="text-align: center; color: #64748b; font-size: 0.75rem;">
        <div>Version 1.0.0 MVP</div>
        <div style="margin-top: 4px;">Built with OpenAI Agents SDK</div>
    </div>
    """, unsafe_allow_html=True)

# ============================================================================
# MAIN CONTENT
# ============================================================================

# Header
st.markdown('<h1 class="main-header">🦷 DENTRA AI Voice Agent</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Enterprise-Grade AI Receptionist for Dental Clinics</p>', unsafe_allow_html=True)

# ============================================================================
# KEY METRICS ROW
# ============================================================================

stats = get_dashboard_stats(selected_clinic_id)
call_data = generate_call_data()
patient_data = generate_patient_data()

col1, col2, col3, col4, col5, col6 = st.columns(6)

metrics = [
    ("📞", "Total Calls", f"{call_data['total_calls'].sum():,}", "+12% vs last month", col1),
    ("📅", "Appointments", f"{stats.get('appointments', {}).get('total', 50)}", "+8% vs last month", col2),
    ("✅", "Booking Rate", "76%", "+5% vs last month", col3),
    ("💰", "Revenue", "$158,000", "+15% vs last month", col4),
    ("👥", "New Patients", f"{patient_data['new_this_month']}", "+22% vs last month", col5),
    ("⚡", "Avg Response", "0.8s", "-0.2s vs last month", col6),
]

for icon, label, value, delta, col in metrics:
    with col:
        st.markdown(f"""
        <div class="metric-card">
            <div style="font-size: 2rem;">{icon}</div>
            <div class="metric-value">{value}</div>
            <div class="metric-label">{label}</div>
            <div class="metric-delta">↑ {delta.split('+')[1] if '+' in delta else delta}</div>
        </div>
        """, unsafe_allow_html=True)

st.divider()

# ============================================================================
# TABS
# ============================================================================

tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
    "🤖 AI Agents", 
    "📊 Analytics", 
    "📞 Live Demo", 
    "📅 Appointments",
    "🎯 ML Predictions",
    "ℹ️ Features"
])

# ============================================================================
# TAB 1: AI AGENTS
# ============================================================================

with tab1:
    st.markdown('<h2 class="section-header">🤖 The Dentra Crew™ - Multi-Agent Architecture</h2>', unsafe_allow_html=True)
    
    # Architecture diagram
    st.markdown("""
    <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 16px; padding: 30px; margin: 20px 0; text-align: center;">
        <div style="color: #f1f5f9; font-size: 1.2rem; margin-bottom: 20px;">
            Incoming Call → Twilio → Deepgram (STT) → <span style="color: #a78bfa; font-weight: 700;">OpenAI Agents SDK</span> → ElevenLabs (TTS) → Patient
        </div>
        <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-top: 30px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 15px 25px; border-radius: 12px;">
                🎤 Voice Agent
            </div>
            <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 15px 25px; border-radius: 12px;">
                📅 Scheduler Agent
            </div>
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 15px 25px; border-radius: 12px;">
                🔒 Policy Agent
            </div>
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 15px 25px; border-radius: 12px;">
                🔧 Ops Agent
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Agent cards
    col1, col2, col3, col4 = st.columns(4)
    
    agents = [
        ("🎤", "Voice Agent", "Natural conversation orchestration with intent detection, insurance collection, and symptom gathering", 
         ["Intent Detection", "Insurance Collection", "Symptom Triage", "Patient Recognition"], col1),
        ("📅", "Scheduler Agent", "Revenue-aware appointment booking with smart slot prioritization and conflict resolution",
         ["Revenue Priority", "Doctor Matching", "Conflict Detection", "Duration Matching"], col2),
        ("🔒", "Policy Agent", "HIPAA compliance, consent capture, and comprehensive audit trail management",
         ["Consent Capture", "PHI Logging", "Audit Trails", "Compliance Check"], col3),
        ("🔧", "Ops Agent", "Failure recovery, escalation handling, and staff coordination",
         ["Auto-Retry", "Staff Alerts", "Callback Queue", "Error Recovery"], col4),
    ]
    
    for icon, name, desc, features, col in agents:
        with col:
            features_html = "".join([f'<span style="background: rgba(99, 102, 241, 0.3); padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; margin: 3px; display: inline-block;">{f}</span>' for f in features])
            st.markdown(f"""
            <div class="agent-card">
                <div class="agent-icon">{icon}</div>
                <div class="agent-name">{name}</div>
                <div class="agent-desc">{desc}</div>
                <div style="margin-top: 15px;">
                    {features_html}
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    # Agent tools
    st.markdown('<h3 class="section-header">🛠️ AI Agent Tools (Function Calling)</h3>', unsafe_allow_html=True)
    
    tools = [
        ("🔍", "lookup_patient", "Find patient by phone number"),
        ("➕", "create_patient", "Register new patient"),
        ("👨‍⚕️", "get_doctors", "List clinic doctors"),
        ("📆", "check_availability", "Find open slots"),
        ("✅", "book_appointment", "Create booking"),
        ("🔄", "reschedule_appointment", "Move appointment"),
        ("❌", "cancel_appointment", "Cancel booking"),
        ("🏥", "update_insurance", "Update patient insurance"),
        ("🚨", "create_escalation", "Alert staff"),
        ("📊", "assess_urgency", "Triage symptoms"),
    ]
    
    cols = st.columns(5)
    for i, (icon, name, desc) in enumerate(tools):
        with cols[i % 5]:
            st.markdown(f"""
            <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(99, 102, 241, 0.2);
                        border-radius: 8px; padding: 12px; margin: 5px 0; text-align: center;">
                <div style="font-size: 1.5rem;">{icon}</div>
                <div style="color: #a78bfa; font-size: 0.8rem; font-family: monospace;">{name}</div>
                <div style="color: #64748b; font-size: 0.7rem; margin-top: 4px;">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

# ============================================================================
# TAB 2: ANALYTICS
# ============================================================================

with tab2:
    st.markdown('<h2 class="section-header">📊 Real-Time Analytics Dashboard</h2>', unsafe_allow_html=True)
    
    # Call volume chart
    col1, col2 = st.columns(2)
    
    with col1:
        call_data = generate_call_data()
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=call_data['date'], y=call_data['total_calls'],
            name='Total Calls', line=dict(color='#6366f1', width=3),
            fill='tozeroy', fillcolor='rgba(99, 102, 241, 0.2)'
        ))
        fig.add_trace(go.Scatter(
            x=call_data['date'], y=call_data['booked'],
            name='Booked', line=dict(color='#10b981', width=3),
            fill='tozeroy', fillcolor='rgba(16, 185, 129, 0.2)'
        ))
        fig.update_layout(
            title='📞 Call Volume (Last 30 Days)',
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=350,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        revenue_data = generate_revenue_data()
        fig = px.bar(
            revenue_data, x='service', y='revenue',
            color='revenue',
            color_continuous_scale=['#6366f1', '#a78bfa', '#f472b6'],
            title='💰 Revenue by Service Type'
        )
        fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=350,
            showlegend=False
        )
        st.plotly_chart(fig, use_container_width=True)
    
    # Second row
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # Call distribution by hour
        hourly = generate_hourly_calls()
        fig = go.Figure(data=[go.Bar(
            x=hourly['hour'], y=hourly['calls'],
            marker=dict(
                color=hourly['calls'],
                colorscale=[[0, '#6366f1'], [0.5, '#a78bfa'], [1, '#f472b6']]
            )
        )])
        fig.update_layout(
            title='🕐 Calls by Hour',
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=300,
            xaxis_title='Hour of Day',
            yaxis_title='Number of Calls'
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # Intent distribution
        intents = pd.DataFrame({
            'intent': ['New Booking', 'Reschedule', 'Inquiry', 'Emergency', 'Cancel'],
            'count': [450, 120, 180, 45, 35]
        })
        fig = px.pie(
            intents, values='count', names='intent',
            color_discrete_sequence=['#6366f1', '#8b5cf6', '#a78bfa', '#ef4444', '#64748b'],
            title='🎯 Call Intent Distribution',
            hole=0.4
        )
        fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            height=300
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col3:
        # Insurance breakdown
        insurance = pd.DataFrame({
            'provider': ['Delta Dental', 'Cigna', 'Aetna', 'MetLife', 'No Insurance'],
            'patients': [320, 245, 198, 156, 120]
        })
        fig = px.pie(
            insurance, values='patients', names='provider',
            color_discrete_sequence=['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
            title='🏥 Insurance Distribution',
            hole=0.4
        )
        fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            height=300
        )
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 3: LIVE DEMO
# ============================================================================

with tab3:
    st.markdown('<h2 class="section-header">📞 Live Conversation Demo</h2>', unsafe_allow_html=True)
    
    st.markdown("""
    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="color: #a78bfa; font-weight: 600; margin-bottom: 10px;">💡 How It Works</div>
        <div style="color: #94a3b8;">
            Watch how DENTRA handles a complete patient call - from greeting to booking confirmation, 
            including insurance collection and symptom assessment.
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Conversation demo
    conversation = [
        ("ai", "🦷 DENTRA", "Thank you for calling SmileCare Dental. This call may be recorded for quality purposes. This is Dentra, your AI assistant. How can I help you today?"),
        ("user", "👤 Patient", "Hi, I need to schedule a cleaning appointment."),
        ("ai", "🦷 DENTRA", "I'd be happy to help you schedule a cleaning! Are you a current patient with us, or would this be your first visit?"),
        ("user", "👤 Patient", "I'm a new patient."),
        ("ai", "🦷 DENTRA", "Welcome to SmileCare! May I have your full name please?"),
        ("user", "👤 Patient", "Sarah Johnson."),
        ("ai", "🦷 DENTRA", "Thank you, Sarah. And a phone number where we can reach you?"),
        ("user", "👤 Patient", "555-234-5678."),
        ("ai", "🦷 DENTRA", "Great! Do you have dental insurance?"),
        ("user", "👤 Patient", "Yes, I have Delta Dental."),
        ("ai", "🦷 DENTRA", "Perfect. And may I have your Delta Dental member ID or policy number?"),
        ("user", "👤 Patient", "It's DLT98765432."),
        ("ai", "🦷 DENTRA", "Thank you. Would you prefer a morning or afternoon appointment?"),
        ("user", "👤 Patient", "Morning works best for me."),
        ("ai", "🦷 DENTRA", "I have Tuesday January 28th at 10am or Wednesday the 29th at 9:30am. Which works better for you?"),
        ("user", "👤 Patient", "Tuesday at 10 sounds great."),
        ("ai", "🦷 DENTRA", "Perfect! Let me confirm everything: I have Sarah Johnson scheduled for a cleaning appointment on Tuesday, January 28th at 10am. Your insurance is Delta Dental, member ID DLT98765432. We have your phone number as 555-234-5678. Does everything sound correct?"),
        ("user", "👤 Patient", "Yes, that's all correct!"),
        ("ai", "🦷 DENTRA", "Wonderful! Your appointment is confirmed. You'll receive a text confirmation shortly with all the details. Is there anything else I can help you with today?"),
        ("user", "👤 Patient", "No, that's all. Thanks!"),
        ("ai", "🦷 DENTRA", "Thank you for calling, Sarah. We look forward to seeing you Tuesday! Have a wonderful day. 😊"),
    ]
    
    # Display conversation with animation
    if st.button("▶️ Play Conversation Demo", type="primary"):
        chat_container = st.container()
        with chat_container:
            for role, speaker, message in conversation:
                bubble_class = "chat-bubble-ai" if role == "ai" else "chat-bubble-user"
                st.markdown(f"""
                <div class="{bubble_class}">
                    <div class="chat-label">{speaker}</div>
                    <div>{message}</div>
                </div>
                """, unsafe_allow_html=True)
                time.sleep(0.5)
        
        st.success("✅ Appointment booked successfully! Insurance captured: Delta Dental (DLT98765432)")
    else:
        # Show static conversation
        for role, speaker, message in conversation[:6]:
            bubble_class = "chat-bubble-ai" if role == "ai" else "chat-bubble-user"
            st.markdown(f"""
            <div class="{bubble_class}">
                <div class="chat-label">{speaker}</div>
                <div>{message}</div>
            </div>
            """, unsafe_allow_html=True)
        
        st.info("👆 Click 'Play Conversation Demo' to see the full conversation flow")

# ============================================================================
# TAB 4: APPOINTMENTS
# ============================================================================

with tab4:
    st.markdown('<h2 class="section-header">📅 Appointment Management</h2>', unsafe_allow_html=True)
    
    # Status filters
    col1, col2, col3 = st.columns([1, 1, 2])
    with col1:
        status_filter = st.selectbox("Filter by Status", ["All", "Scheduled", "Confirmed", "Completed", "Cancelled"])
    with col2:
        date_filter = st.date_input("Filter by Date", value=None)
    
    # Appointments table
    appointments = get_appointments(selected_clinic_id, limit=20)
    
    if appointments:
        df = pd.DataFrame(appointments)
        
        # Process data
        display_df = pd.DataFrame({
            'Patient': df.apply(lambda x: x["patient"]["name"] if x.get("patient") else "🟢 Available", axis=1),
            'Clinic': df.apply(lambda x: x["clinic"]["name"] if x.get("clinic") else "-", axis=1),
            'Service': df['service_type'],
            'Date': pd.to_datetime(df['appointment_date']).dt.strftime('%b %d, %Y'),
            'Time': df.get('start_time', '09:00'),
            'Status': df['status'].str.upper()
        })
        
        # Apply styling
        def style_status(val):
            colors = {
                'SCHEDULED': 'background-color: rgba(59, 130, 246, 0.3)',
                'CONFIRMED': 'background-color: rgba(16, 185, 129, 0.3)',
                'COMPLETED': 'background-color: rgba(99, 102, 241, 0.3)',
                'CANCELLED': 'background-color: rgba(239, 68, 68, 0.3)',
                'AVAILABLE': 'background-color: rgba(34, 197, 94, 0.3)'
            }
            return colors.get(val, '')
        
        st.dataframe(
            display_df,
            use_container_width=True,
            hide_index=True,
            height=400
        )
    else:
        st.info("No appointments found. Book some appointments to see them here!")
    
    # Quick stats
    st.markdown("### 📊 Appointment Statistics")
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Today's Appointments", "12", "+3 vs yesterday")
    with col2:
        st.metric("This Week", "67", "+8% vs last week")
    with col3:
        st.metric("Confirmation Rate", "92%", "+5%")
    with col4:
        st.metric("No-Show Rate", "6%", "-2%")

# ============================================================================
# TAB 5: ML PREDICTIONS
# ============================================================================

with tab5:
    st.markdown('<h2 class="section-header">🎯 ML-Powered Predictions</h2>', unsafe_allow_html=True)
    
    st.markdown("""
    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3);
                border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="color: #a78bfa; font-weight: 600; margin-bottom: 10px;">🧠 Machine Learning Models</div>
        <div style="color: #94a3b8;">
            DENTRA uses ML models trained on conversation data to predict patient behavior, 
            optimize scheduling, and improve outcomes.
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">📉</div>
            <div class="feature-title">No-Show Prediction</div>
            <div class="feature-text">
                Predicts which patients are likely to miss appointments based on:
                <ul style="color: #94a3b8; margin-top: 10px;">
                    <li>Past no-show history</li>
                    <li>Appointment time</li>
                    <li>Day of week</li>
                    <li>Weather forecast</li>
                </ul>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Simulated prediction
        st.markdown("#### Sample Predictions")
        no_show_data = pd.DataFrame({
            'Patient': ['John D.', 'Sarah M.', 'Mike R.', 'Lisa K.'],
            'Appointment': ['Jan 28', 'Jan 28', 'Jan 29', 'Jan 29'],
            'Risk': ['Low', 'Medium', 'High', 'Low'],
            'Score': [0.12, 0.45, 0.78, 0.08]
        })
        st.dataframe(no_show_data, hide_index=True)
    
    with col2:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">💰</div>
            <div class="feature-title">Revenue Optimization</div>
            <div class="feature-text">
                Maximizes chair utilization and revenue by:
                <ul style="color: #94a3b8; margin-top: 10px;">
                    <li>Prioritizing high-value procedures</li>
                    <li>Smart slot allocation</li>
                    <li>Cancellation fill prediction</li>
                    <li>Optimal scheduling times</li>
                </ul>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Revenue optimization gauge
        fig = go.Figure(go.Indicator(
            mode = "gauge+number+delta",
            value = 87,
            delta = {'reference': 75},
            title = {'text': "Chair Utilization %"},
            gauge = {
                'axis': {'range': [0, 100]},
                'bar': {'color': "#6366f1"},
                'steps': [
                    {'range': [0, 50], 'color': "rgba(239, 68, 68, 0.3)"},
                    {'range': [50, 75], 'color': "rgba(245, 158, 11, 0.3)"},
                    {'range': [75, 100], 'color': "rgba(16, 185, 129, 0.3)"}
                ]
            }
        ))
        fig.update_layout(
            height=250,
            paper_bgcolor='rgba(0,0,0,0)',
            font={'color': '#f1f5f9'}
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col3:
        st.markdown("""
        <div class="feature-card">
            <div class="feature-icon">😊</div>
            <div class="feature-title">Sentiment Analysis</div>
            <div class="feature-text">
                Real-time call sentiment monitoring:
                <ul style="color: #94a3b8; margin-top: 10px;">
                    <li>Detect frustrated patients</li>
                    <li>Identify satisfied callers</li>
                    <li>Auto-escalate negative calls</li>
                    <li>Track satisfaction trends</li>
                </ul>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Sentiment gauge
        fig = go.Figure(go.Indicator(
            mode = "gauge+number",
            value = 0.72,
            title = {'text': "Avg Sentiment Score"},
            gauge = {
                'axis': {'range': [-1, 1]},
                'bar': {'color': "#10b981"},
                'steps': [
                    {'range': [-1, -0.3], 'color': "rgba(239, 68, 68, 0.3)"},
                    {'range': [-0.3, 0.3], 'color': "rgba(245, 158, 11, 0.3)"},
                    {'range': [0.3, 1], 'color': "rgba(16, 185, 129, 0.3)"}
                ]
            }
        ))
        fig.update_layout(
            height=250,
            paper_bgcolor='rgba(0,0,0,0)',
            font={'color': '#f1f5f9'}
        )
        st.plotly_chart(fig, use_container_width=True)

# ============================================================================
# TAB 6: FEATURES
# ============================================================================

with tab6:
    st.markdown('<h2 class="section-header">ℹ️ Complete Feature Overview</h2>', unsafe_allow_html=True)
    
    # Feature grid
    features = [
        ("📞", "24/7 Voice AI", "Never miss a call. DENTRA answers phones around the clock with natural, empathetic conversation."),
        ("🏥", "Insurance Collection", "Captures both insurance provider AND member ID on every call - critical for billing."),
        ("🩺", "Symptom Triage", "Intelligent urgency scoring. Emergencies get same-day slots, routine care fills gaps."),
        ("💰", "Revenue-Aware Scheduling", "High-value procedures get prime slots. Maximize chair utilization and revenue."),
        ("👤", "Patient Recognition", "Returning patients get personalized greetings with visit history context."),
        ("📊", "ML Analytics", "Continuous learning from conversations. Gets smarter with every call."),
        ("🔔", "Automated Reminders", "24/48 hour reminder calls reduce no-shows by 30-40%."),
        ("🚫", "Spam Filtering", "80%+ spam call detection. Real patients get through instantly."),
        ("🔒", "HIPAA Compliant", "Full audit trails, consent capture, and encrypted data storage."),
        ("📱", "Multi-Clinic", "Manage multiple locations from one dashboard with unified analytics."),
        ("🔄", "Smart Escalation", "Complex cases automatically transferred to staff with full context."),
        ("📈", "ROI Tracking", "Measure revenue recovery and cost savings in real-time."),
    ]
    
    cols = st.columns(3)
    for i, (icon, title, desc) in enumerate(features):
        with cols[i % 3]:
            st.markdown(f"""
            <div class="feature-card" style="margin-bottom: 20px;">
                <div class="feature-icon">{icon}</div>
                <div class="feature-title">{title}</div>
                <div class="feature-text">{desc}</div>
            </div>
            """, unsafe_allow_html=True)
    
    st.divider()
    
    # Comparison table
    st.markdown("### 📊 DENTRA vs Competitors")
    
    comparison = pd.DataFrame({
        'Feature': ['24/7 Voice AI', 'Insurance Collection', 'Revenue-Aware Scheduling', 'Symptom Triage', 
                   'ML Learning', 'Spam Filtering', 'HIPAA Compliance', 'Multi-Clinic'],
        'DENTRA': ['✅', '✅ Full', '✅', '✅', '✅', '✅ 80%+', '✅', '✅'],
        'Competitor A': ['✅', '⚠️ Basic', '❌', '✅', '⚠️', '✅', '⚠️', '✅'],
        'Competitor B': ['✅', '❌', '❌', '❌', '❌', '❌', '⚠️', '⚠️'],
        'Traditional IVR': ['❌', '❌', '❌', '❌', '❌', '❌', '❌', '⚠️']
    })
    
    st.dataframe(comparison, hide_index=True, use_container_width=True)
    
    st.divider()
    
    # Business impact
    st.markdown("### 💼 Business Impact")
    
    col1, col2, col3, col4 = st.columns(4)
    
    impacts = [
        ("$100K-150K", "Annual Revenue Recovery", "From missed calls", col1),
        ("3-4 hrs/day", "Staff Time Saved", "Per clinic", col2),
        ("30-40%", "No-Show Reduction", "With reminders", col3),
        ("2-3 months", "ROI Timeline", "Positive returns", col4),
    ]
    
    for value, label, sublabel, col in impacts:
        with col:
            st.markdown(f"""
            <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2));
                        border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 16px; padding: 24px; text-align: center;">
                <div style="font-size: 2rem; font-weight: 700; color: #a78bfa;">{value}</div>
                <div style="color: #f1f5f9; font-weight: 600; margin-top: 8px;">{label}</div>
                <div style="color: #64748b; font-size: 0.85rem; margin-top: 4px;">{sublabel}</div>
            </div>
            """, unsafe_allow_html=True)

# ============================================================================
# FOOTER
# ============================================================================

st.divider()

st.markdown(f"""
<div style="text-align: center; padding: 30px 0;">
    <div style="font-size: 2rem; margin-bottom: 10px;">🦷</div>
    <div style="color: #94a3b8; font-size: 0.9rem;">
        DENTRA AI Voice Agent | Enterprise Demo Dashboard
    </div>
    <div style="color: #64748b; font-size: 0.8rem; margin-top: 8px;">
        Backend: {API_BASE} | Built with OpenAI Agents SDK + Streamlit
    </div>
    <div style="color: #475569; font-size: 0.75rem; margin-top: 8px;">
        © 2026 DENTRA. All rights reserved.
    </div>
</div>
""", unsafe_allow_html=True)
