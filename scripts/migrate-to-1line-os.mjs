// scripts/migrate-to-1line-os.mjs
// Idempotent migration script for 1Line OS (Schema 5.1).
// Upgrades legacy leads, lead_contacts, and properties to the unified 1Line OS data model.
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import {
  createPersonDraft,
  createBuyerProfileDraft,
  generatePropertyCode
} from '../src/models/schema.js';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'demo-1line-os';
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

console.log(`Starting 1Line OS migration on project ${PROJECT_ID} (Emulator: ${EMULATOR_HOST})...`);

const [host, port] = EMULATOR_HOST.split(':');
const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);
connectFirestoreEmulator(db, host, Number(port));

async function runMigration() {
  let migratedPersons = 0;
  let migratedProperties = 0;

  // 1. Migrate Leads to Persons + Person Contacts
  const leadsSnap = await getDocs(collection(db, 'leads'));
  console.log(`Found ${leadsSnap.size} legacy leads to migrate.`);

  const batch = writeBatch(db);
  let batchCount = 0;

  for (const leadDoc of leadsSnap.docs) {
    const lead = leadDoc.data();
    const leadId = leadDoc.id;

    // Build unified Person document
    const person = createPersonDraft({
      name: lead.name || 'عميل محول',
      types: [lead.type || 'buyer'],
      source: lead.source || 'website',
      howDidYouHearAboutUs: lead.howDidYouHearAboutUs || 'founder_content',
      segment: lead.segment || 'B',
      consent: true,
      city: lead.details?.governorate || 'سوهاج',
      sector: lead.details?.area || 'شرق',
      assignedTo: lead.assignedTo || 'Sales Team A',
      status: lead.status || 'new',
      migratedFromLeadId: leadId,
      migratedAt: serverTimestamp()
    });

    if (lead.type === 'buyer' || !lead.type) {
      person.buyerProfile = createBuyerProfileDraft({
        budgetMin: lead.details?.budget ? Math.round(lead.details.budget * 0.8) : 1000000,
        budgetMax: lead.details?.budget || 2000000,
        paymentMethod: lead.details?.paymentMethod || 'cash',
        targetSectors: [lead.details?.area || 'شرق'],
        purpose: lead.details?.purpose || 'residence'
      });
    }

    batch.set(doc(db, 'persons', leadId), person, { merge: true });

    // Migrate contact
    const contactRef = doc(db, 'lead_contacts', leadId);
    batch.set(doc(db, 'person_contacts', leadId), {
      phone: lead.phone || '',
      whatsapp: lead.whatsapp || '',
      assignedTo: person.assignedTo,
      migratedAt: serverTimestamp()
    }, { merge: true });

    batchCount += 2;
    migratedPersons++;

    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  // 2. Upgrade Properties with Gates and Structured Codes
  const propsSnap = await getDocs(collection(db, 'properties'));
  console.log(`Found ${propsSnap.size} properties to upgrade with 1Line OS Gates.`);

  let propSeq = 1;
  for (const propDoc of propsSnap.docs) {
    const prop = propDoc.data();
    const propId = propDoc.id;

    const code = prop.code || generatePropertyCode('SOH', prop.sector || 'E', propSeq++);
    const upgraded = {
      code,
      gate1: prop.gate1 || {
        sellerIdentityMatchesDeed: true,
        contractChainContinuous: true,
        areaSurveyMatches: true,
        deedType: 'registered',
        allPassed: prop.grade === 'A'
      },
      gate2: prop.gate2 || {
        priceAndAvailabilityReconfirmed: false,
        negativeCertificateObtained: false,
        propertyMemoReady: false,
        buyerInformedInWritingOfTitleType: false,
        allPassed: false
      },
      gate3: prop.gate3 || {
        originalDocumentsInspectedByLawyer: false,
        contractDraftedByCompanyLawyer: false,
        paymentMethodVerified: false,
        commissionAgreementSigned: false,
        executedPrice: 0,
        allPassed: false
      },
      updatedAt: serverTimestamp()
    };

    batch.set(doc(db, 'properties', propId), upgraded, { merge: true });
    batchCount++;
    migratedProperties++;

    if (batchCount >= 400) {
      await batch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ 1Line OS Migration Complete: ${migratedPersons} persons created, ${migratedProperties} properties upgraded.`);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
