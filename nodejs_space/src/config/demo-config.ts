/**
 * Demo Configuration
 * In-memory store for demo settings like active clinic
 * This allows Streamlit to control which clinic the AI represents
 */

class DemoConfig {
  private activeClinicId: string | null = null;

  setActiveClinic(clinicId: string) {
    this.activeClinicId = clinicId;
  }

  getActiveClinicId(): string | null {
    return this.activeClinicId;
  }

  clearActiveClinic() {
    this.activeClinicId = null;
  }
}

// Singleton instance
export const demoConfig = new DemoConfig();
