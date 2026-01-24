import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.appointment.deleteMany();
  await prisma.call.deleteMany();
  await prisma.service.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.clinic.deleteMany();

  // Create 5 clinics
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'SmileCare Dental',
        phone: '+15551234567',
        address: '123 Main St, New York, NY 10001',
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
    prisma.clinic.create({
      data: {
        name: 'Riverside Dental Care',
        phone: '+15554567890',
        address: '321 River Rd, Houston, TX 77001',
        hours: JSON.stringify({
          mon: '8:00-17:00',
          tue: '8:00-17:00',
          wed: '8:00-17:00',
          thu: '8:00-17:00',
          fri: '8:00-15:00',
          sat: 'Closed',
          sun: 'Closed',
        }),
      },
    }),
    prisma.clinic.create({
      data: {
        name: 'Gentle Touch Dentistry',
        phone: '+15555678901',
        address: '654 Pine St, Phoenix, AZ 85001',
        hours: JSON.stringify({
          mon: '9:00-18:00',
          tue: '9:00-18:00',
          wed: '9:00-18:00',
          thu: '9:00-18:00',
          fri: '9:00-16:00',
          sat: '10:00-14:00',
          sun: 'Closed',
        }),
      },
    }),
  ]);

  console.log(`✅ Created ${clinics.length} clinics`);

  // Create services for each clinic
  const commonServices = [
    { service_name: 'Regular Cleaning', duration_minutes: 60, price: 120 },
    { service_name: 'Dental Filling', duration_minutes: 45, price: 250 },
    { service_name: 'Crown Placement', duration_minutes: 90, price: 1200 },
    { service_name: 'Root Canal', duration_minutes: 120, price: 1500 },
    { service_name: 'Tooth Extraction', duration_minutes: 30, price: 300 },
  ];

  for (const clinic of clinics) {
    await Promise.all(
      commonServices.map((service) =>
        prisma.service.create({
          data: {
            clinic_id: clinic.id,
            ...service,
          },
        }),
      ),
    );
  }

  console.log(
    `✅ Created ${commonServices.length} services for each clinic (${clinics.length * commonServices.length} total)`,
  );

  // Create 20 patients
  const patients = [];
  const patientData = [
    {
      name: 'John Smith',
      phone: '+15551111111',
      email: 'john.smith@email.com',
      date_of_birth: new Date('1985-03-15'),
      insurance_info: JSON.stringify({ provider: 'Blue Cross', policy: 'BC123456' }),
    },
    {
      name: 'Sarah Johnson',
      phone: '+15552222222',
      email: 'sarah.j@email.com',
      date_of_birth: new Date('1990-07-22'),
      insurance_info: JSON.stringify({ provider: 'Aetna', policy: 'AE789012' }),
    },
    {
      name: 'Michael Brown',
      phone: '+15553333333',
      email: 'mbrown@email.com',
      date_of_birth: new Date('1978-11-30'),
      insurance_info: JSON.stringify({ provider: 'Cigna', policy: 'CG345678' }),
    },
    {
      name: 'Emily Davis',
      phone: '+15554444444',
      email: 'emily.davis@email.com',
      date_of_birth: new Date('1995-01-10'),
      insurance_info: JSON.stringify({ provider: 'United Healthcare', policy: 'UH901234' }),
    },
    {
      name: 'David Wilson',
      phone: '+15555555555',
      email: 'dwilson@email.com',
      date_of_birth: new Date('1982-05-18'),
      insurance_info: JSON.stringify({ provider: 'Blue Shield', policy: 'BS567890' }),
    },
    {
      name: 'Jessica Martinez',
      phone: '+15556666666',
      email: 'jmartinez@email.com',
      date_of_birth: new Date('1988-09-25'),
      insurance_info: JSON.stringify({ provider: 'Delta Dental', policy: 'DD234567' }),
    },
    {
      name: 'Robert Taylor',
      phone: '+15557777777',
      email: 'rtaylor@email.com',
      date_of_birth: new Date('1975-12-08'),
      insurance_info: JSON.stringify({ provider: 'MetLife', policy: 'ML890123' }),
    },
    {
      name: 'Jennifer Anderson',
      phone: '+15558888888',
      email: 'janderson@email.com',
      date_of_birth: new Date('1992-04-14'),
      insurance_info: JSON.stringify({ provider: 'Guardian', policy: 'GU456789' }),
    },
    {
      name: 'William Thomas',
      phone: '+15559999999',
      email: 'wthomas@email.com',
      date_of_birth: new Date('1980-08-20'),
    },
    {
      name: 'Linda Jackson',
      phone: '+15551010101',
      email: 'ljackson@email.com',
      date_of_birth: new Date('1987-02-17'),
      insurance_info: JSON.stringify({ provider: 'Humana', policy: 'HU012345' }),
    },
    {
      name: 'James White',
      phone: '+15552020202',
      email: 'jwhite@email.com',
      date_of_birth: new Date('1993-06-05'),
    },
    {
      name: 'Patricia Harris',
      phone: '+15553030303',
      email: 'pharris@email.com',
      date_of_birth: new Date('1984-10-12'),
      insurance_info: JSON.stringify({ provider: 'Blue Cross', policy: 'BC678901' }),
    },
    {
      name: 'Christopher Martin',
      phone: '+15554040404',
      email: 'cmartin@email.com',
      date_of_birth: new Date('1979-03-28'),
    },
    {
      name: 'Barbara Thompson',
      phone: '+15555050505',
      email: 'bthompson@email.com',
      date_of_birth: new Date('1991-07-03'),
      insurance_info: JSON.stringify({ provider: 'Aetna', policy: 'AE234567' }),
    },
    {
      name: 'Daniel Garcia',
      phone: '+15556060606',
      email: 'dgarcia@email.com',
      date_of_birth: new Date('1986-11-19'),
    },
    {
      name: 'Nancy Rodriguez',
      phone: '+15557070707',
      email: 'nrodriguez@email.com',
      date_of_birth: new Date('1994-01-26'),
      insurance_info: JSON.stringify({ provider: 'Cigna', policy: 'CG890123' }),
    },
    {
      name: 'Matthew Lee',
      phone: '+15558080808',
      email: 'mlee@email.com',
      date_of_birth: new Date('1981-05-09'),
    },
    {
      name: 'Karen Walker',
      phone: '+15559090909',
      email: 'kwalker@email.com',
      date_of_birth: new Date('1989-09-15'),
      insurance_info: JSON.stringify({ provider: 'United Healthcare', policy: 'UH456789' }),
    },
    {
      name: 'Joseph Hall',
      phone: '+15551212121',
      email: 'jhall@email.com',
      date_of_birth: new Date('1977-12-22'),
    },
    {
      name: 'Lisa Allen',
      phone: '+15553131313',
      email: 'lallen@email.com',
      date_of_birth: new Date('1996-04-07'),
      insurance_info: JSON.stringify({ provider: 'Delta Dental', policy: 'DD012345' }),
    },
  ];

  for (const data of patientData) {
    const patient = await prisma.patient.create({ data });
    patients.push(patient);
  }

  console.log(`✅ Created ${patients.length} patients`);

  // Create 10 appointments per clinic (mix of available and booked)
  let totalAppointments = 0;
  for (const clinic of clinics) {
    const now = new Date();

    // Create 6 booked appointments (sequentially to avoid connection issues)
    for (let i = 0; i < 6; i++) {
      const randomPatient = patients[Math.floor(Math.random() * patients.length)];
      const daysAhead = Math.floor(Math.random() * 14) + 1;
      const appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + daysAhead);
      appointmentDate.setHours(9 + i, 0, 0, 0);

      await prisma.appointment.create({
        data: {
          clinic_id: clinic.id,
          patient_id: randomPatient.id,
          appointment_date: appointmentDate,
          service_type: commonServices[Math.floor(Math.random() * commonServices.length)].service_name,
          status: 'scheduled',
          notes: 'Booked via phone call',
        },
      });
      totalAppointments++;
    }

    // Create 4 available slots (no patient assigned)
    for (let i = 6; i < 10; i++) {
      const daysAhead = Math.floor(Math.random() * 14) + 1;
      const appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + daysAhead);
      appointmentDate.setHours(9 + i, 0, 0, 0);

      await prisma.appointment.create({
        data: {
          clinic_id: clinic.id,
          appointment_date: appointmentDate,
          service_type: 'Available Slot',
          status: 'available',
        },
      });
      totalAppointments++;
    }
  }

  console.log(`✅ Created ${totalAppointments} appointments`);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${clinics.length} clinics`);
  console.log(`   - ${patients.length} patients`);
  console.log(`   - ${clinics.length * commonServices.length} services`);
  console.log(`   - ${totalAppointments} appointments`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
