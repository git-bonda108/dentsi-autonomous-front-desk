import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for DENTSI MVP...');

  // Clear existing data in correct order (respecting foreign keys)
  console.log('🧹 Clearing existing data...');
  await prisma.conversation_log.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.call.deleteMany();
  await prisma.conversation_script.deleteMany();
  await prisma.service.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.clinic.deleteMany();

  // ==========================================================================
  // CREATE CLINICS
  // ==========================================================================
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'SmileCare Dental',
        phone: '+15551234567',
        address: '123 Main St, New York, NY 10001',
        timezone: 'America/New_York',
        hours: JSON.stringify({
          mon: '9:00-17:00',
          tue: '9:00-17:00',
          wed: '9:00-17:00',
          thu: '9:00-17:00',
          fri: '9:00-15:00',
          sat: 'Closed',
          sun: 'Closed',
        }),
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Bright Teeth Family Dentistry',
        phone: '+15552345678',
        address: '456 Oak Ave, Los Angeles, CA 90001',
        timezone: 'America/Los_Angeles',
        hours: JSON.stringify({
          mon: '8:00-18:00',
          tue: '8:00-18:00',
          wed: '8:00-18:00',
          thu: '8:00-18:00',
          fri: '8:00-16:00',
          sat: '9:00-13:00',
          sun: 'Closed',
        }),
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Downtown Dental Associates',
        phone: '+15553456789',
        address: '789 Elm St, Chicago, IL 60601',
        timezone: 'America/Chicago',
        hours: JSON.stringify({
          mon: '9:00-17:00',
          tue: '9:00-17:00',
          wed: '9:00-17:00',
          thu: '9:00-17:00',
          fri: '9:00-17:00',
          sat: 'Closed',
          sun: 'Closed',
        }),
      },
    }),
  ]);
  console.log(`✅ Created ${clinics.length} clinics`);

  // ==========================================================================
  // CREATE DOCTORS (2-3 per clinic)
  // ==========================================================================
  const doctorsByClinic: Record<string, any[]> = {};
  
  // Clinic 1: SmileCare Dental
  doctorsByClinic[clinics[0].id] = await Promise.all([
    prisma.doctor.create({
      data: {
        clinic_id: clinics[0].id,
        name: 'Dr. Emily Chen',
        specialty: 'General Dentistry',
        phone: '+15551234501',
        email: 'dr.chen@smilecare.com',
        bio: 'Dr. Chen has over 15 years of experience in family dentistry. She specializes in preventive care and is known for her gentle approach.',
        available_hours: JSON.stringify({
          mon: ['9:00-12:00', '13:00-17:00'],
          tue: ['9:00-12:00', '13:00-17:00'],
          wed: ['9:00-12:00'],
          thu: ['9:00-12:00', '13:00-17:00'],
          fri: ['9:00-15:00'],
        }),
      },
    }),
    prisma.doctor.create({
      data: {
        clinic_id: clinics[0].id,
        name: 'Dr. Michael Roberts',
        specialty: 'Oral Surgery',
        phone: '+15551234502',
        email: 'dr.roberts@smilecare.com',
        bio: 'Dr. Roberts is a board-certified oral surgeon specializing in extractions, implants, and corrective jaw surgery.',
        available_hours: JSON.stringify({
          mon: ['10:00-12:00', '14:00-17:00'],
          wed: ['9:00-12:00', '13:00-17:00'],
          fri: ['9:00-14:00'],
        }),
      },
    }),
    prisma.doctor.create({
      data: {
        clinic_id: clinics[0].id,
        name: 'Dr. Sarah Kim',
        specialty: 'Pediatric Dentistry',
        phone: '+15551234503',
        email: 'dr.kim@smilecare.com',
        bio: 'Dr. Kim loves working with children and makes every visit fun and stress-free.',
        available_hours: JSON.stringify({
          tue: ['9:00-12:00', '13:00-17:00'],
          thu: ['9:00-12:00', '13:00-17:00'],
        }),
      },
    }),
  ]);

  // Clinic 2: Bright Teeth
  doctorsByClinic[clinics[1].id] = await Promise.all([
    prisma.doctor.create({
      data: {
        clinic_id: clinics[1].id,
        name: 'Dr. James Wilson',
        specialty: 'General Dentistry',
        phone: '+15552345601',
        email: 'dr.wilson@brightteeth.com',
        bio: 'Dr. Wilson brings 20 years of experience to every patient interaction.',
        available_hours: JSON.stringify({
          mon: ['8:00-12:00', '13:00-18:00'],
          tue: ['8:00-12:00', '13:00-18:00'],
          wed: ['8:00-12:00', '13:00-18:00'],
          thu: ['8:00-12:00', '13:00-18:00'],
          fri: ['8:00-16:00'],
        }),
      },
    }),
    prisma.doctor.create({
      data: {
        clinic_id: clinics[1].id,
        name: 'Dr. Lisa Patel',
        specialty: 'Cosmetic Dentistry',
        phone: '+15552345602',
        email: 'dr.patel@brightteeth.com',
        bio: 'Dr. Patel is an expert in smile makeovers, veneers, and teeth whitening.',
        available_hours: JSON.stringify({
          mon: ['9:00-13:00'],
          wed: ['8:00-12:00', '13:00-17:00'],
          fri: ['8:00-15:00'],
          sat: ['9:00-13:00'],
        }),
      },
    }),
  ]);

  // Clinic 3: Downtown Dental
  doctorsByClinic[clinics[2].id] = await Promise.all([
    prisma.doctor.create({
      data: {
        clinic_id: clinics[2].id,
        name: 'Dr. Robert Martinez',
        specialty: 'Endodontics',
        phone: '+15553456701',
        email: 'dr.martinez@downtowndental.com',
        bio: 'Dr. Martinez specializes in root canal therapy and has performed over 5,000 procedures.',
        available_hours: JSON.stringify({
          mon: ['9:00-12:00', '13:00-17:00'],
          tue: ['9:00-12:00', '13:00-17:00'],
          wed: ['9:00-12:00', '13:00-17:00'],
          thu: ['9:00-12:00', '13:00-17:00'],
          fri: ['9:00-12:00', '13:00-17:00'],
        }),
      },
    }),
    prisma.doctor.create({
      data: {
        clinic_id: clinics[2].id,
        name: 'Dr. Amanda Thompson',
        specialty: 'General Dentistry',
        phone: '+15553456702',
        email: 'dr.thompson@downtowndental.com',
        bio: 'Dr. Thompson focuses on comprehensive care for the whole family.',
        available_hours: JSON.stringify({
          mon: ['9:00-17:00'],
          tue: ['9:00-17:00'],
          wed: ['9:00-12:00'],
          thu: ['9:00-17:00'],
          fri: ['9:00-17:00'],
        }),
      },
    }),
  ]);

  const totalDoctors = Object.values(doctorsByClinic).flat().length;
  console.log(`✅ Created ${totalDoctors} doctors`);

  // ==========================================================================
  // CREATE SERVICES
  // ==========================================================================
  const serviceTemplates = [
    { service_name: 'Regular Cleaning', duration_minutes: 60, price: 120, category: 'preventive', description: 'Professional teeth cleaning and polishing' },
    { service_name: 'Deep Cleaning', duration_minutes: 90, price: 250, category: 'preventive', description: 'Thorough cleaning for gum disease prevention' },
    { service_name: 'Dental Filling', duration_minutes: 45, price: 250, category: 'general', description: 'Composite or amalgam filling for cavities' },
    { service_name: 'Crown Placement', duration_minutes: 90, price: 1200, category: 'general', description: 'Custom dental crown restoration' },
    { service_name: 'Root Canal', duration_minutes: 120, price: 1500, category: 'general', description: 'Root canal therapy to save damaged teeth' },
    { service_name: 'Tooth Extraction', duration_minutes: 30, price: 300, category: 'general', description: 'Simple tooth extraction' },
    { service_name: 'Teeth Whitening', duration_minutes: 60, price: 400, category: 'cosmetic', description: 'Professional in-office whitening treatment' },
    { service_name: 'Dental Implant', duration_minutes: 120, price: 3500, category: 'general', description: 'Titanium implant for missing teeth' },
    { service_name: 'Emergency Visit', duration_minutes: 30, price: 200, category: 'emergency', description: 'Urgent dental care for pain or injury' },
    { service_name: 'Consultation', duration_minutes: 30, price: 75, category: 'general', description: 'Initial exam and treatment planning' },
  ];

  for (const clinic of clinics) {
    await Promise.all(
      serviceTemplates.map((service) =>
        prisma.service.create({
          data: {
            clinic_id: clinic.id,
            ...service,
          },
        }),
      ),
    );
  }
  console.log(`✅ Created ${serviceTemplates.length * clinics.length} services`);

  // ==========================================================================
  // CREATE PATIENTS (Enhanced with history)
  // ==========================================================================
  const patients: any[] = [];
  const patientDataList = [
    {
      name: 'John Smith',
      phone: '+15551111111',
      email: 'john.smith@email.com',
      date_of_birth: new Date('1985-03-15'),
      insurance_provider: 'Delta Dental',
      insurance_id: 'DD123456789',
      insurance_group: 'GRP001',
      insurance_verified: true,
      insurance_verified_at: new Date('2025-12-01'),
      preferred_time: 'morning',
      preferred_days: JSON.stringify(['Monday', 'Wednesday', 'Friday']),
      last_visit_date: new Date('2025-07-15'),
      total_visits: 8,
      medical_history: JSON.stringify({
        allergies: ['Penicillin'],
        medications: ['Lisinopril 10mg'],
        conditions: ['Hypertension'],
      }),
      dental_history: JSON.stringify({
        last_cleaning: '2025-07-15',
        treatments: [
          { date: '2025-07-15', type: 'Cleaning', notes: 'Good hygiene' },
          { date: '2025-01-10', type: 'Filling', notes: 'Cavity on tooth #14' },
          { date: '2024-07-20', type: 'Cleaning', notes: 'Minor gingivitis' },
        ],
      }),
      notes: 'Prefers morning appointments. Has dental anxiety - use gentle approach.',
    },
    {
      name: 'Sarah Johnson',
      phone: '+15552222222',
      email: 'sarah.j@email.com',
      date_of_birth: new Date('1990-07-22'),
      insurance_provider: 'Blue Cross Blue Shield',
      insurance_id: 'BCBS987654321',
      insurance_verified: true,
      insurance_verified_at: new Date('2025-11-15'),
      preferred_time: 'afternoon',
      last_visit_date: new Date('2025-10-01'),
      total_visits: 12,
      dental_history: JSON.stringify({
        last_cleaning: '2025-10-01',
        treatments: [
          { date: '2025-10-01', type: 'Cleaning', notes: 'Excellent oral health' },
        ],
      }),
    },
    {
      name: 'Michael Brown',
      phone: '+15553333333',
      email: 'mbrown@email.com',
      date_of_birth: new Date('1978-11-30'),
      insurance_provider: 'Cigna',
      insurance_id: 'CG345678',
      insurance_verified: false,
      preferred_time: 'evening',
      last_visit_date: new Date('2024-08-15'),
      total_visits: 3,
      notes: 'Overdue for cleaning. Send recall reminder.',
    },
    {
      name: 'Emily Davis',
      phone: '+15554444444',
      email: 'emily.davis@email.com',
      date_of_birth: new Date('1995-01-10'),
      insurance_provider: 'United Healthcare',
      insurance_id: 'UH901234',
      insurance_verified: true,
      insurance_verified_at: new Date('2026-01-05'),
      preferred_time: 'morning',
      total_visits: 5,
      dental_history: JSON.stringify({
        last_cleaning: '2025-12-01',
        braces_history: 'Had braces 2010-2012',
      }),
    },
    {
      name: 'David Wilson',
      phone: '+15555555555',
      email: 'dwilson@email.com',
      date_of_birth: new Date('1982-05-18'),
      preferred_time: 'afternoon',
      total_visits: 2,
      notes: 'New patient. No insurance on file.',
    },
    {
      name: 'Jessica Martinez',
      phone: '+15556666666',
      email: 'jmartinez@email.com',
      date_of_birth: new Date('1988-09-25'),
      insurance_provider: 'MetLife',
      insurance_id: 'ML234567',
      insurance_verified: true,
      insurance_verified_at: new Date('2025-10-20'),
      language: 'es',
      preferred_time: 'morning',
      last_visit_date: new Date('2025-11-20'),
      total_visits: 15,
      medical_history: JSON.stringify({
        allergies: [],
        medications: [],
        conditions: ['Diabetes Type 2'],
      }),
    },
    {
      name: 'Robert Taylor',
      phone: '+15557777777',
      email: 'rtaylor@email.com',
      date_of_birth: new Date('1975-12-08'),
      insurance_provider: 'Aetna',
      insurance_id: 'AE890123',
      preferred_time: 'afternoon',
      last_visit_date: new Date('2025-06-01'),
      total_visits: 20,
      no_show_count: 2,
      notes: 'Has missed 2 appointments. Confirm 24 hours before.',
    },
    {
      name: 'Jennifer Anderson',
      phone: '+15558888888',
      email: 'janderson@email.com',
      date_of_birth: new Date('1992-04-14'),
      insurance_provider: 'Guardian',
      insurance_id: 'GU456789',
      insurance_verified: true,
      insurance_verified_at: new Date('2026-01-10'),
      preferred_time: 'morning',
      last_visit_date: new Date('2026-01-10'),
      total_visits: 6,
    },
    {
      name: 'William Thomas',
      phone: '+15559999999',
      email: 'wthomas@email.com',
      date_of_birth: new Date('1980-08-20'),
      total_visits: 1,
      notes: 'First visit was consultation only.',
    },
    {
      name: 'Linda Jackson',
      phone: '+15551010101',
      email: 'ljackson@email.com',
      date_of_birth: new Date('1987-02-17'),
      insurance_provider: 'Humana',
      insurance_id: 'HU012345',
      insurance_verified: true,
      insurance_verified_at: new Date('2025-09-01'),
      preferred_time: 'afternoon',
      preferred_days: JSON.stringify(['Tuesday', 'Thursday']),
      last_visit_date: new Date('2025-09-15'),
      total_visits: 10,
    },
  ];

  // Assign preferred doctors and clinics to patients
  const allDoctors = Object.values(doctorsByClinic).flat();
  
  for (let i = 0; i < patientDataList.length; i++) {
    const data = patientDataList[i];
    // Assign patients to clinics round-robin
    const clinicId = clinics[i % clinics.length].id;
    // Assign preferred doctor to every other patient
    const preferredDoctorId = i % 2 === 0 && allDoctors[i % allDoctors.length] 
      ? allDoctors[i % allDoctors.length].id 
      : undefined;
    
    const patient = await prisma.patient.create({ 
      data: {
        ...data,
        clinic_id: clinicId,
        preferred_doctor_id: preferredDoctorId,
      } 
    });
    patients.push(patient);
  }
  console.log(`✅ Created ${patients.length} patients`);

  // ==========================================================================
  // CREATE APPOINTMENTS
  // ==========================================================================
  let totalAppointments = 0;
  const now = new Date();

  for (const clinic of clinics) {
    const clinicDoctors = doctorsByClinic[clinic.id];
    
    // Create appointments for the next 2 weeks
    for (let day = 1; day <= 14; day++) {
      const appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + day);
      
      // Skip weekends
      if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) continue;

      // Create 3-4 appointments per day per clinic
      const appointmentsPerDay = 3 + Math.floor(Math.random() * 2);
      
      for (let slot = 0; slot < appointmentsPerDay; slot++) {
        const randomPatient = patients[Math.floor(Math.random() * patients.length)];
        const randomDoctor = clinicDoctors[Math.floor(Math.random() * clinicDoctors.length)];
        const randomService = serviceTemplates[Math.floor(Math.random() * serviceTemplates.length)];
        
        const slotDate = new Date(appointmentDate);
        slotDate.setHours(9 + slot * 2, 0, 0, 0); // Appointments at 9, 11, 13, 15

        await prisma.appointment.create({
          data: {
            clinic_id: clinic.id,
            patient_id: randomPatient.id,
            doctor_id: randomDoctor.id,
            appointment_date: slotDate,
            duration_minutes: randomService.duration_minutes,
            service_type: randomService.service_name,
            reason: `Scheduled ${randomService.service_name.toLowerCase()}`,
            status: 'scheduled',
            notes: 'Booked via AI agent',
          },
        });
        totalAppointments++;
      }
    }
  }
  console.log(`✅ Created ${totalAppointments} appointments`);

  // ==========================================================================
  // CREATE CONVERSATION SCRIPTS (Natural language templates)
  // ==========================================================================
  const scriptTemplates = [
    // Greeting Scripts
    {
      name: 'Default Greeting - New Patient',
      type: 'greeting',
      script_content: `Thank you for calling {clinic_name}. This is Dentra, your AI dental assistant. I'll be helping you today. May I have your name please?`,
      system_prompt: `You are Dentra, a friendly AI dental receptionist. The caller appears to be a new patient. Be warm, welcoming, and collect their basic information. Always introduce yourself and the clinic name.`,
      variables: JSON.stringify(['clinic_name']),
      conditions: JSON.stringify({ patient_type: 'new' }),
      priority: 10,
    },
    {
      name: 'Default Greeting - Returning Patient',
      type: 'greeting',
      script_content: `Hi {patient_name}! Welcome back to {clinic_name}. This is Dentra, your AI assistant. I see you were last here on {last_visit_date}. How can I help you today?`,
      system_prompt: `You are Dentra, a friendly AI dental receptionist. The caller is a returning patient named {patient_name}. Reference their history naturally. They last visited on {last_visit_date}. Their preferred doctor is {preferred_doctor}. Make them feel recognized and valued.`,
      variables: JSON.stringify(['clinic_name', 'patient_name', 'last_visit_date', 'preferred_doctor']),
      conditions: JSON.stringify({ patient_type: 'returning' }),
      priority: 20,
    },
    // Booking Flow Scripts
    {
      name: 'Appointment Booking - Ask Service Type',
      type: 'booking_flow',
      script_content: `I'd be happy to help you schedule an appointment. What type of service do you need? We offer cleanings, checkups, fillings, and other dental services.`,
      system_prompt: `Help the patient identify what dental service they need. Common services include: cleaning, checkup, filling, crown, root canal, extraction, whitening. Ask clarifying questions if needed.`,
      variables: JSON.stringify(['available_services']),
      priority: 10,
    },
    {
      name: 'Appointment Booking - Ask Preferences',
      type: 'booking_flow',
      script_content: `Great! For your {service_type}, do you have a preferred day or time? We have morning and afternoon slots available.`,
      system_prompt: `The patient wants to book a {service_type}. Ask about their scheduling preferences. Consider their historical preferences if available: preferred time is {preferred_time}, preferred days are {preferred_days}.`,
      variables: JSON.stringify(['service_type', 'preferred_time', 'preferred_days']),
      priority: 20,
    },
    {
      name: 'Appointment Booking - Doctor Preference',
      type: 'doctor_preference',
      script_content: `I see you usually see {preferred_doctor}. Would you like to schedule with them, or would another doctor work for you?`,
      system_prompt: `The patient has a preferred doctor: {preferred_doctor}. Offer to book with them first. If not available, suggest alternatives. Available doctors: {available_doctors}.`,
      variables: JSON.stringify(['preferred_doctor', 'available_doctors']),
      conditions: JSON.stringify({ has_preferred_doctor: true }),
      priority: 10,
    },
    {
      name: 'Appointment Booking - No Doctor Preference',
      type: 'doctor_preference',
      script_content: `We have several excellent doctors available. Would you like me to find the first available appointment, or do you have a preference?`,
      system_prompt: `The patient has no preferred doctor on file. Offer to find the first available appointment or let them choose from available doctors: {available_doctors}.`,
      variables: JSON.stringify(['available_doctors']),
      conditions: JSON.stringify({ has_preferred_doctor: false }),
      priority: 5,
    },
    // Insurance Scripts
    {
      name: 'Insurance - Existing on File',
      type: 'insurance',
      script_content: `I see we have your {insurance_provider} insurance on file. Is this still your current coverage?`,
      system_prompt: `The patient has insurance on file: {insurance_provider}, ID: {insurance_id}. Confirm it's still valid. If they have new insurance, collect the updated information.`,
      variables: JSON.stringify(['insurance_provider', 'insurance_id']),
      conditions: JSON.stringify({ has_insurance: true }),
      priority: 10,
    },
    {
      name: 'Insurance - Not on File',
      type: 'insurance',
      script_content: `Do you have dental insurance you'd like us to use for this visit? If so, I can take down your information. If not, no problem - we can still get you scheduled.`,
      system_prompt: `The patient doesn't have insurance on file. Ask if they have dental insurance. If yes, collect: provider name, member/policy ID, and group number. If no, reassure them and continue booking.`,
      variables: JSON.stringify([]),
      conditions: JSON.stringify({ has_insurance: false }),
      priority: 5,
    },
    // Confirmation Script
    {
      name: 'Booking Confirmation',
      type: 'confirmation',
      script_content: `Perfect! I've scheduled your {service_type} appointment for {appointment_date} at {appointment_time} with {doctor_name}. You'll receive a text confirmation shortly. Is there anything else I can help you with?`,
      system_prompt: `Confirm the booking details clearly. Appointment: {service_type} on {appointment_date} at {appointment_time} with {doctor_name}. Ask if they need anything else before ending the call.`,
      variables: JSON.stringify(['service_type', 'appointment_date', 'appointment_time', 'doctor_name']),
      priority: 10,
    },
    // Error Recovery Scripts
    {
      name: 'Error Recovery - Misunderstanding',
      type: 'error_recovery',
      script_content: `I'm sorry, I didn't quite catch that. Could you please repeat what you said?`,
      system_prompt: `You didn't understand the patient. Ask them to repeat or clarify. Be apologetic but not overly so. Stay helpful and patient.`,
      priority: 10,
    },
    {
      name: 'Error Recovery - Transfer to Staff',
      type: 'error_recovery',
      script_content: `I want to make sure you get the best help possible. Let me connect you with one of our staff members. Please hold for just a moment.`,
      system_prompt: `The situation requires human intervention. Apologize, explain you're transferring them, and create an escalation ticket.`,
      priority: 20,
    },
    // Emergency Script
    {
      name: 'Emergency Handling',
      type: 'emergency',
      script_content: `I understand you're in pain. Let me prioritize getting you in as soon as possible. We have emergency appointments available. Can you describe your symptoms briefly so I can help the doctor prepare?`,
      system_prompt: `This is an EMERGENCY call. The patient is experiencing pain or urgent dental issue. Show empathy. Collect: nature of emergency, severity (1-10), any visible damage, how long they've had symptoms. Book the earliest emergency slot available.`,
      priority: 100,
    },
  ];

  // Create scripts for each clinic
  for (const clinic of clinics) {
    for (const script of scriptTemplates) {
      await prisma.conversation_script.create({
        data: {
          clinic_id: clinic.id,
          ...script,
        },
      });
    }
  }
  console.log(`✅ Created ${scriptTemplates.length * clinics.length} conversation scripts`);

  // ==========================================================================
  // CREATE SAMPLE CALLS (for dashboard testing)
  // ==========================================================================
  const callOutcomes = ['booked', 'rescheduled', 'cancelled', 'info_provided', 'escalated'];
  const intents = ['new_appointment', 'reschedule', 'cancel', 'inquiry'];
  
  let totalCalls = 0;
  for (const clinic of clinics) {
    for (let i = 0; i < 5; i++) {
      const randomPatient = patients[Math.floor(Math.random() * patients.length)];
      const callDate = new Date(now);
      callDate.setDate(now.getDate() - Math.floor(Math.random() * 7));
      
      await prisma.call.create({
        data: {
          clinic_id: clinic.id,
          patient_id: randomPatient.id,
          call_sid: `CA${Date.now()}${Math.random().toString(36).substring(7)}`,
          caller_phone: randomPatient.phone,
          duration: 60 + Math.floor(Math.random() * 300),
          status: 'completed',
          intent: intents[Math.floor(Math.random() * intents.length)],
          outcome: callOutcomes[Math.floor(Math.random() * callOutcomes.length)],
          transcript: `Dentra: Thank you for calling ${clinic.name}. How can I help you today?\nPatient: Hi, I'd like to schedule an appointment.\nDentra: I'd be happy to help. What type of service do you need?\nPatient: Just a regular cleaning.\nDentra: Great! I have availability this week. Would morning or afternoon work better for you?`,
          sentiment_score: 0.7 + Math.random() * 0.3,
          created_at: callDate,
        },
      });
      totalCalls++;
    }
  }
  console.log(`✅ Created ${totalCalls} sample calls`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n🎉 Database seeding completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${clinics.length} clinics`);
  console.log(`   - ${totalDoctors} doctors`);
  console.log(`   - ${patients.length} patients (with history & preferences)`);
  console.log(`   - ${serviceTemplates.length * clinics.length} services`);
  console.log(`   - ${totalAppointments} appointments`);
  console.log(`   - ${scriptTemplates.length * clinics.length} conversation scripts`);
  console.log(`   - ${totalCalls} sample calls`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
