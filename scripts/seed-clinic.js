const { PrismaClient, VisitDisposition } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) {
    console.log('No school found!');
    return;
  }
  console.log('Found school:', school.name, school.id);

  // 1. Seed Clinic Inventory
  const inventoryItems = [
    {
      itemCode: 'MED-PCM-500',
      name: 'Paracetamol 500mg Tablets',
      category: 'MEDICATION',
      dosageForm: 'Tablet',
      unit: 'Tablets',
      quantityOnHand: 450,
      reorderLevel: 50,
      locationRack: 'Rack A1 - Analgesics',
      notes: 'General pain and mild fever management',
    },
    {
      itemCode: 'MED-ACT-480',
      name: 'Artemether-Lumefantrine 80/480mg',
      category: 'MEDICATION',
      dosageForm: 'Tablet',
      unit: 'Blisters (6 tabs)',
      quantityOnHand: 28,
      reorderLevel: 10,
      locationRack: 'Rack A2 - Antimalarials',
      notes: 'First-line therapy for uncomplicated malaria',
    },
    {
      itemCode: 'MED-ORS-SCT',
      name: 'Oral Rehydration Salts (WHO Formula)',
      category: 'MEDICATION',
      dosageForm: 'Sachet',
      unit: 'Sachets',
      quantityOnHand: 80,
      reorderLevel: 25,
      locationRack: 'Rack B1 - Rehydration',
      notes: 'Electrolyte replenishment for acute gastroenteritis and dehydration',
    },
    {
      itemCode: 'MED-CPM-004',
      name: 'Chlorpheniramine (Piriton) 4mg',
      category: 'MEDICATION',
      dosageForm: 'Tablet',
      unit: 'Tablets',
      quantityOnHand: 180,
      reorderLevel: 30,
      locationRack: 'Rack B2 - Antihistamines',
      notes: 'Allergic rhinitis, insect bites, acute rashes',
    },
    {
      itemCode: 'MED-IBU-400',
      name: 'Ibuprofen 400mg Tablets',
      category: 'MEDICATION',
      dosageForm: 'Tablet',
      unit: 'Tablets',
      quantityOnHand: 12,
      reorderLevel: 20,
      locationRack: 'Rack A1 - Analgesics',
      notes: 'Non-steroidal anti-inflammatory for joint pain / dysmenorrhea',
    },
    {
      itemCode: 'FA-MSP-500',
      name: 'Methylated Spirit 70% (500ml)',
      category: 'FIRST_AID',
      dosageForm: 'Liquid',
      unit: 'Bottles',
      quantityOnHand: 8,
      reorderLevel: 3,
      locationRack: 'Shelf C - Antiseptics',
      notes: 'Skin disinfection and wound preparation',
    },
    {
      itemCode: 'FA-CTN-500',
      name: 'Absorbent Cotton Wool Roll (500g)',
      category: 'FIRST_AID',
      dosageForm: 'Roll',
      unit: 'Rolls',
      quantityOnHand: 14,
      reorderLevel: 5,
      locationRack: 'Shelf C - Dressings',
      notes: 'Wound cleaning and dressing padding',
    },
    {
      itemCode: 'FA-CRB-075',
      name: 'Crepe Bandage (7.5cm x 4.5m)',
      category: 'FIRST_AID',
      dosageForm: 'Bandage',
      unit: 'Rolls',
      quantityOnHand: 22,
      reorderLevel: 8,
      locationRack: 'Shelf D - Bandages',
      notes: 'Ankle sprains, wrist injuries during PE',
    },
    {
      itemCode: 'FA-PLS-100',
      name: 'Adhesive Strip Plasters (Box of 100)',
      category: 'FIRST_AID',
      dosageForm: 'Strips',
      unit: 'Boxes',
      quantityOnHand: 5,
      reorderLevel: 2,
      locationRack: 'Shelf D - Bandages',
      notes: 'Minor cuts and abrasions',
    },
    {
      itemCode: 'EQ-THM-DIG',
      name: 'Digital Infrared Forehead Thermometer',
      category: 'EQUIPMENT',
      dosageForm: 'Device',
      unit: 'Units',
      quantityOnHand: 3,
      reorderLevel: 1,
      locationRack: 'Triage Desk',
      notes: 'Daily temperature screening',
    },
  ];

  for (const item of inventoryItems) {
    await prisma.clinicInventory.upsert({
      where: { itemCode: item.itemCode },
      update: {
        name: item.name,
        category: item.category,
        dosageForm: item.dosageForm,
        unit: item.unit,
        quantityOnHand: item.quantityOnHand,
        reorderLevel: item.reorderLevel,
        locationRack: item.locationRack,
        notes: item.notes,
      },
      create: {
        schoolId: school.id,
        ...item,
      },
    });
  }
  console.log('Seeded clinic inventory items.');

  // 2. Update Student Health Profiles
  const students = await prisma.student.findMany({
    where: { schoolId: school.id },
    take: 10,
  });

  const genotypes = ['AA', 'AS', 'AA', 'SS', 'AA', 'AS', 'AC', 'AA', 'AA', 'AS'];
  const bloodGroups = ['O+', 'A+', 'B+', 'O+', 'AB+', 'O-', 'A+', 'O+', 'B+', 'O+'];
  const allergiesList = [
    'None reported',
    'Penicillin allergy (severe rash)',
    'None reported',
    'Peanut allergy, Cold-induced asthma',
    'None reported',
    'Sulfa drugs allergy',
    'None reported',
    'Dust and pollen sensitive',
    'None reported',
    'None reported',
  ];
  const chronicList = [
    'None',
    'None',
    'None',
    'Sickle Cell Disease (HbSS) - Needs hydration and warmth',
    'None',
    'Mild Asthma - carries inhaler',
    'None',
    'None',
    'None',
    'None',
  ];

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    await prisma.student.update({
      where: { id: s.id },
      data: {
        genotype: genotypes[i % genotypes.length],
        bloodGroup: bloodGroups[i % bloodGroups.length],
        allergies: allergiesList[i % allergiesList.length],
        chronicConditions: chronicList[i % chronicList.length],
        emergencyContactName: s.guardianName || 'Alhaji Abubakar (Father)',
        emergencyContactPhone: s.guardianPhone || '08029839848',
        medicalNotes: 'Annual medical clearance on file at school clinic.',
      },
    });
  }
  console.log('Updated student health profiles for ' + students.length + ' students.');

  // 3. Create Sample Clinic Visits
  if (students.length >= 2) {
    const student1 = students[0];
    const student2 = students[1];

    const visit1 = await prisma.clinicVisit.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        complaint: 'Severe headache and mild chills during morning period',
        symptoms: 'Temperature elevated, slight dizziness',
        temperature: 37.8,
        bloodPressure: '110/70',
        pulseRate: 78,
        weight: 42.5,
        diagnosis: 'Mild febrile illness / Fatigue',
        treatmentGiven: 'Administered 2x Paracetamol 500mg with 500ml water. Rested in sick bay for 45 mins.',
        disposition: 'RETURNED_TO_CLASS',
        parentNotified: true,
        parentNotificationTime: new Date(),
        doctorNotes: 'Advised class teacher to monitor. If fever persists, refer for malaria RDT test.',
      },
    });

    const pcm = await prisma.clinicInventory.findFirst({ where: { itemCode: 'MED-PCM-500' } });
    if (pcm) {
      await prisma.medicationDispense.create({
        data: {
          schoolId: school.id,
          visitId: visit1.id,
          studentId: student1.id,
          inventoryId: pcm.id,
          quantity: 2,
          dosage: '2 tabs stat with water',
        },
      });
    }

    const visit2 = await prisma.clinicVisit.create({
      data: {
        schoolId: school.id,
        studentId: student2.id,
        complaint: 'Abdominal cramps and mild nausea after break',
        symptoms: 'Stomach tenderness, normal bowel movement',
        temperature: 36.6,
        bloodPressure: '105/65',
        pulseRate: 74,
        weight: 38.0,
        diagnosis: 'Suspected mild dyspepsia / indigestion',
        treatmentGiven: 'Oral rehydration solution 200ml administered. Placed on resting cot.',
        disposition: 'RESTING_IN_BAY',
        parentNotified: false,
        doctorNotes: 'Observing for 1 hour. Will notify parent if cramps escalate.',
      },
    });

    console.log('Created sample clinic visits: ' + visit1.id + ', ' + visit2.id);

    // 4. Create Immunization Record
    await prisma.immunizationRecord.create({
      data: {
        schoolId: school.id,
        studentId: student1.id,
        vaccineName: 'Tetanus Toxoid (TT)',
        doseNumber: 1,
        administeredAt: new Date('2025-02-10'),
        nextDueDate: new Date('2025-08-10'),
        provider: 'Primary Health Care Centre Kashere',
        batchNumber: 'TT-NIG-2024-991',
        notes: 'State routine adolescent immunization drive',
      },
    });
    console.log('Created sample immunization record.');
  }

  console.log('All clinic seed operations completed successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
