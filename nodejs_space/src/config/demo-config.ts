/**
 * Demo Configuration
 * In-memory store for demo settings like active clinic
 * This allows Streamlit to control which clinic the AI represents
 */

class DemoConfig {
  // Default to SmileCare Dental
  private activeClinicId: string | null = 'ea239f20-2e76-4192-82bb-3ac9e7df4236';

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
