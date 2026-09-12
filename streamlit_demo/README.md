# Streamlit Operations & Demo Apps

Streamlit front-ends for the Dentsi backend. They poll the backend's REST API
(dashboard stats, appointments, calls, escalations, live transcript) and are
used for demos and day-to-day operational visibility.

## Apps

| File | What it is |
|------|------------|
| `dentsi_app.py` | Primary app (9 tabs: Appointments, Calendar, Patients, Conversations, Text & SMS, Doctors, Revenue, Analytics, Escalations) with a live-transcript side pane that polls `GET /transcript/live`. |
| `dentsi_complete.py` | Demo variant with a browser-based conversation tester driving `POST /webhook/demo`. |
| `dentsi_dashboard.py` | Earlier 6-tab variant of the demo dashboard. |
| `dentra_app.py` | Presentation build with generated sample data in the Analytics/ML tabs. |
| `app.py` | Minimal 4-tab table view (Appointments, Calls, Clinics, About). |

## Run

```bash
cd streamlit_demo
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
streamlit run dentsi_app.py
```

Opens at http://localhost:8501.

## Configuration

Each app defines `API_BASE` near the top of the file, pointing at the backend.
Edit it to your backend origin (e.g. `http://localhost:3000` for local
development) before running. `dentsi_app.py` and `dentsi_complete.py` also
define the display phone number constants near `API_BASE`.

## Theme

`.streamlit/config.toml` sets the dark theme and headless server mode.
