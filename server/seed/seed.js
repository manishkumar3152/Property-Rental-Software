require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Owner = require('../models/Owner');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Agreement = require('../models/Agreement');
const RentInvoice = require('../models/RentInvoice');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const FineRule = require('../models/FineRule');
const OwnerLedger = require('../models/OwnerLedger');
const Settlement = require('../models/Settlement');
const ApplicationSettings = require('../models/ApplicationSettings');
const { generateSecureToken } = require('../utils/tokenGenerator');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/property_rental_erp';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB. Clearing existing collections...');

    // Clear collections
    await Promise.all([
      User.deleteMany({}),
      Owner.deleteMany({}),
      Property.deleteMany({}),
      Tenant.deleteMany({}),
      Agreement.deleteMany({}),
      RentInvoice.deleteMany({}),
      Payment.deleteMany({}),
      Receipt.deleteMany({}),
      FineRule.deleteMany({}),
      OwnerLedger.deleteMany({}),
      Settlement.deleteMany({}),
      ApplicationSettings.deleteMany({}),
    ]);

    console.log('[Seed] Existing collections cleared.');

    // 1. Application Settings
    console.log('[Seed] Creating Application Settings...');
    const settings = await ApplicationSettings.create({
      companyName: 'PropRent ERP Systems',
      address: 'Prestige Tech Park, Marathahalli-Sarjapur Outer Ring Rd, Bengaluru, Karnataka 560103',
      contactEmail: 'support@propertyerp.com',
      contactPhone: '+91 98765 43210',
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      razorpaySettings: {
        isLiveMode: false,
        autoTransferEnabled: false,
        defaultTransferMode: 'manual',
      },
      whatsappSettings: {
        autoSendInvoiceReminders: true,
        reminderDaysBeforeDue: [5, 0],
        overdueReminderDays: [1, 7, 14],
        autoSendPaymentReceipts: true,
      },
      rentSettings: {
        defaultDueDay: 10,
        defaultGracePeriod: 3,
        proratedRentCalculation: true,
        autoGenerateRentOnDay: 1,
      },
      lateFineSettings: {
        defaultRuleType: 'per_day',
        defaultAmount: 100,
        defaultPercentage: 5,
        maxFineLimit: 2000,
      },
    });

    // 2. Global Fine Rules
    console.log('[Seed] Creating Fine Rules...');
    const fineRules = await FineRule.create([
      {
        name: 'Standard Daily Fine (₹100/day after 3 days grace)',
        ruleType: 'per_day',
        amount: 100,
        gracePeriodDays: 3,
        maxFineLimit: 2000,
        isDefault: true,
        isActive: true,
        description: 'Applies ₹100 for each day overdue following a 3-day grace period, up to ₹2,000.',
      },
      {
        name: 'Commercial High-Value Fine (5% of rent)',
        ruleType: 'percentage',
        percentage: 5,
        gracePeriodDays: 5,
        maxFineLimit: 10000,
        isDefault: false,
        isActive: true,
        description: 'Applies 5% of monthly rent after 5 days grace.',
      },
      {
        name: 'Fixed Penalty (₹500)',
        ruleType: 'fixed',
        amount: 500,
        gracePeriodDays: 3,
        maxFineLimit: 500,
        isDefault: false,
        isActive: true,
        description: 'Fixed flat fine of ₹500 on delayed payment.',
      },
    ]);

    // 3. Property Owners (3 Owners)
    console.log('[Seed] Creating 3 Property Owners...');
    const ownersData = [
      {
        ownerCode: 'OWN-001',
        name: 'Rajesh Sharma',
        mobile: '+91 98450 11223',
        whatsappNumber: '+91 98450 11223',
        email: 'rajesh.sharma@example.com',
        address: {
          street: '14, 100 Feet Road, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560038',
        },
        panNumber: 'ABCPS1234A',
        bankDetails: {
          accountHolder: 'Rajesh Sharma',
          accountNumber: '50100234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank',
          branch: 'Indiranagar Branch',
          isVerified: true,
        },
        razorpayLinkedAccountId: 'acc_RzpOwnerRajesh01',
        linkedAccountStatus: 'active',
        status: 'active',
        commissionRate: 2,
        notes: 'Commercial & high-street retail property specialist.',
      },
      {
        ownerCode: 'OWN-002',
        name: 'Priya Patel',
        mobile: '+91 98200 44556',
        whatsappNumber: '+91 98200 44556',
        email: 'priya.patel@example.com',
        address: {
          street: '72, Palm Meadows, Varthur Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560066',
        },
        panNumber: 'BPPPT5678B',
        bankDetails: {
          accountHolder: 'Priya Patel',
          accountNumber: '00230156789123',
          ifscCode: 'ICIC0000023',
          bankName: 'ICICI Bank',
          branch: 'Whitefield Branch',
          isVerified: true,
        },
        razorpayLinkedAccountId: 'acc_RzpOwnerPriya02',
        linkedAccountStatus: 'active',
        status: 'active',
        commissionRate: 3,
        notes: 'Premium residential apartments in East Bengaluru.',
      },
      {
        ownerCode: 'OWN-003',
        name: 'Vikram Malhotra',
        mobile: '+91 98111 88990',
        whatsappNumber: '+91 98111 88990',
        email: 'vikram.malhotra@example.com',
        address: {
          street: '55, Industrial Layout, Peenya 2nd Stage',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560058',
        },
        panNumber: 'CMPVM9012C',
        bankDetails: {
          accountHolder: 'Vikram Malhotra',
          accountNumber: '30456789012345',
          ifscCode: 'SBIN0004567',
          bankName: 'State Bank of India',
          branch: 'Peenya Industrial Area',
          isVerified: true,
        },
        razorpayLinkedAccountId: 'acc_RzpOwnerVikram03',
        linkedAccountStatus: 'pending',
        status: 'active',
        commissionRate: 2.5,
        notes: 'Warehousing, logistics depots, and corporate offices.',
      },
    ];

    const owners = await Owner.create(ownersData);
    const [owner1, owner2, owner3] = owners;

    // 4. Create Users (Super Admin, 3 Owners, Staff Manager)
    console.log('[Seed] Creating Users (Super Admin, Owners, Staff)...');
    const users = await User.create([
      {
        name: 'Super Admin',
        email: 'admin@propertyerp.com',
        password: 'Admin@12345',
        role: 'super_admin',
        mobile: '+91 99999 00001',
        status: 'active',
        permissions: ['all'],
      },
      {
        name: 'Rajesh Sharma',
        email: 'rajesh.sharma@example.com',
        password: 'Owner@12345',
        role: 'owner',
        ownerId: owner1._id,
        mobile: owner1.mobile,
        status: 'active',
      },
      {
        name: 'Priya Patel',
        email: 'priya.patel@example.com',
        password: 'Owner@12345',
        role: 'owner',
        ownerId: owner2._id,
        mobile: owner2.mobile,
        status: 'active',
      },
      {
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@example.com',
        password: 'Owner@12345',
        role: 'owner',
        ownerId: owner3._id,
        mobile: owner3.mobile,
        status: 'active',
      },
      {
        name: 'Operations Manager',
        email: 'manager@propertyerp.com',
        password: 'Staff@12345',
        role: 'staff',
        mobile: '+91 98888 77777',
        status: 'active',
        permissions: ['manage_properties', 'manage_tenants', 'generate_rent', 'send_whatsapp'],
      },
    ]);

    const adminUser = users[0];

    // 5. 50 Properties (18 for Owner 1, 16 for Owner 2, 16 for Owner 3)
    console.log('[Seed] Generating 50 Properties...');
    const propertyConfigs = [
      // Owner 1: Commercial Shops, Offices, Showrooms
      { owner: owner1, type: 'Shop', name: 'Metro Plaza High Street Retail', baseRent: 35000, deposit: 150000, locality: 'Indiranagar' },
      { owner: owner1, type: 'Shop', name: 'Indira Commercial Complex', baseRent: 28000, deposit: 120000, locality: 'Indiranagar' },
      { owner: owner1, type: 'Office', name: 'Diamond District Corporate Suite', baseRent: 65000, deposit: 300000, locality: 'Old Airport Road' },
      { owner: owner1, type: 'Office', name: 'Brigade Tech Gateway', baseRent: 75000, deposit: 350000, locality: 'MG Road' },
      { owner: owner1, type: 'Shop', name: 'MG High Street Flagship Store', baseRent: 90000, deposit: 450000, locality: 'MG Road' },
      { owner: owner1, type: 'Office', name: 'Regal Residency Commercial Unit', baseRent: 42000, deposit: 180000, locality: 'Koramangala' },
      { owner: owner1, type: 'Shop', name: 'Koramangala 5th Block Boutique', baseRent: 45000, deposit: 200000, locality: 'Koramangala' },
      { owner: owner1, type: 'Office', name: 'Prestige Meridian Workstation', baseRent: 55000, deposit: 250000, locality: 'MG Road' },
      { owner: owner1, type: 'Shop', name: 'Brigade Road Corner Outlet', baseRent: 80000, deposit: 400000, locality: 'Brigade Road' },
      { owner: owner1, type: 'Office', name: 'Indiranagar Startup Hub', baseRent: 48000, deposit: 220000, locality: 'Indiranagar' },
      { owner: owner1, type: 'Shop', name: 'Domlur Junction Retail Store', baseRent: 32000, deposit: 130000, locality: 'Domlur' },
      { owner: owner1, type: 'Office', name: 'Trinity Square Executive Office', baseRent: 60000, deposit: 280000, locality: 'Trinity Circle' },
      { owner: owner1, type: 'Shop', name: 'Halasuru Market Complex', baseRent: 25000, deposit: 100000, locality: 'Halasuru' },
      { owner: owner1, type: 'Shop', name: 'Victoria Court Commercial Unit', baseRent: 38000, deposit: 160000, locality: 'Richmond Town' },
      { owner: owner1, type: 'Office', name: 'Residency Road Business Center', baseRent: 70000, deposit: 320000, locality: 'Residency Road' },
      { owner: owner1, type: 'Shop', name: 'Commercial Street Galleria', baseRent: 65000, deposit: 300000, locality: 'Commercial Street' },
      { owner: owner1, type: 'Office', name: 'Embassy Point Tech Space', baseRent: 85000, deposit: 400000, locality: 'Infantry Road' },
      { owner: owner1, type: 'Shop', name: 'Lavelle Road Artisan Boutique', baseRent: 50000, deposit: 240000, locality: 'Lavelle Road' },

      // Owner 2: Premium Residential Flats, Houses & Condos
      { owner: owner2, type: 'Flat', name: 'Prestige Palms Luxury 3BHK', baseRent: 42000, deposit: 180000, locality: 'Whitefield' },
      { owner: owner2, type: 'Flat', name: 'Sobha Rose Premium 2BHK', baseRent: 32000, deposit: 130000, locality: 'Whitefield' },
      { owner: owner2, type: 'Flat', name: 'Godrej Air Eco Apartment 3BHK', baseRent: 48000, deposit: 200000, locality: 'Hoodi' },
      { owner: owner2, type: 'House', name: 'Palm Meadows Independent Villa', baseRent: 85000, deposit: 450000, locality: 'Varthur' },
      { owner: owner2, type: 'Flat', name: 'Brigade Cosmopolis Highrise 2BHK', baseRent: 36000, deposit: 150000, locality: 'Whitefield' },
      { owner: owner2, type: 'Flat', name: 'Assetz Marq Modern Condo 3BHK', baseRent: 44000, deposit: 190000, locality: 'Kannamangala' },
      { owner: owner2, type: 'Flat', name: 'Divyasree Republic Studio Flat', baseRent: 22000, deposit: 90000, locality: 'Marathahalli' },
      { owner: owner2, type: 'Flat', name: 'Purva Fountain Square 3BHK', baseRent: 40000, deposit: 170000, locality: 'Marathahalli' },
      { owner: owner2, type: 'House', name: 'Adarsh Palm Retreat Row Villa', baseRent: 95000, deposit: 500000, locality: 'Bellandur' },
      { owner: owner2, type: 'Flat', name: 'Rohan Viti Garden View 2BHK', baseRent: 30000, deposit: 120000, locality: 'Varthur' },
      { owner: owner2, type: 'Flat', name: 'Salarpuria Sattva Greenage 3BHK', baseRent: 50000, deposit: 220000, locality: 'Bommanahalli' },
      { owner: owner2, type: 'Flat', name: 'Prestige Lakeside Habitat 2.5BHK', baseRent: 38000, deposit: 160000, locality: 'Gunjur' },
      { owner: owner2, type: 'House', name: 'Chaitanya Smaran Luxury Duplex', baseRent: 78000, deposit: 380000, locality: 'Whitefield' },
      { owner: owner2, type: 'Flat', name: 'Total Environment Windmills 4BHK', baseRent: 120000, deposit: 600000, locality: 'Whitefield' },
      { owner: owner2, type: 'Flat', name: 'Shriram Greenfield 2BHK', baseRent: 24000, deposit: 100000, locality: 'Budigere Cross' },
      { owner: owner2, type: 'Flat', name: 'Prestige Shantiniketan 3BHK', baseRent: 46000, deposit: 200000, locality: 'ITPL Main Road' },

      // Owner 3: Warehouses, Commercial Offices & Logistics Depots
      { owner: owner3, type: 'Warehouse', name: 'Peenya Industrial Logistics Hub A', baseRent: 75000, deposit: 350000, locality: 'Peenya 1st Stage' },
      { owner: owner3, type: 'Warehouse', name: 'Peenya Cold Storage Facility B', baseRent: 95000, deposit: 450000, locality: 'Peenya 2nd Stage' },
      { owner: owner3, type: 'Warehouse', name: 'Nelamangala Highway Depot 01', baseRent: 60000, deposit: 250000, locality: 'Nelamangala' },
      { owner: owner3, type: 'Warehouse', name: 'Dabaspet Mega Logistics Park', baseRent: 110000, deposit: 550000, locality: 'Dabaspet' },
      { owner: owner3, type: 'Office', name: 'Koramangala 4th Block IT Hub', baseRent: 68000, deposit: 320000, locality: 'Koramangala' },
      { owner: owner3, type: 'Office', name: 'HSR Sector 1 Tech Park Unit', baseRent: 58000, deposit: 260000, locality: 'HSR Layout' },
      { owner: owner3, type: 'Office', name: 'HSR Sector 6 Incubator Space', baseRent: 45000, deposit: 200000, locality: 'HSR Layout' },
      { owner: owner3, type: 'Warehouse', name: 'Bommasandra Industrial Yard', baseRent: 70000, deposit: 300000, locality: 'Bommasandra' },
      { owner: owner3, type: 'Office', name: 'Electronic City Phase 1 Suite', baseRent: 52000, deposit: 240000, locality: 'Electronic City' },
      { owner: owner3, type: 'Warehouse', name: 'Attibele Border Freight Depot', baseRent: 80000, deposit: 380000, locality: 'Attibele' },
      { owner: owner3, type: 'Office', name: 'BTM 2nd Stage Corporate Center', baseRent: 48000, deposit: 220000, locality: 'BTM Layout' },
      { owner: owner3, type: 'Shop', name: 'Jayanagar 4th Block Mega Store', baseRent: 85000, deposit: 420000, locality: 'Jayanagar' },
      { owner: owner3, type: 'Office', name: 'JP Nagar 6th Phase Cowork Space', baseRent: 42000, deposit: 180000, locality: 'JP Nagar' },
      { owner: owner3, type: 'Warehouse', name: 'Yeshwanthpur Wholesale Depot', baseRent: 65000, deposit: 280000, locality: 'Yeshwanthpur' },
      { owner: owner3, type: 'Office', name: 'Rajajinagar Industrial Suite', baseRent: 38000, deposit: 160000, locality: 'Rajajinagar' },
      { owner: owner3, type: 'Warehouse', name: 'Peenya Heavy Machinery Unit C', baseRent: 90000, deposit: 400000, locality: 'Peenya 3rd Stage' },
    ];

    const properties = [];
    for (let i = 0; i < propertyConfigs.length; i++) {
      const cfg = propertyConfigs[i];
      const propNumber = `Unit-${101 + (i % 20)}`;
      const propertyId = `PROP-${1001 + i}`;

      const prop = await Property.create({
        propertyId,
        propertyName: cfg.name,
        propertyNumber: propNumber,
        propertyType: cfg.type,
        ownerId: cfg.owner._id,
        address: {
          fullAddress: `${propNumber}, ${cfg.name}, ${cfg.locality}, Bengaluru`,
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560001',
        },
        monthlyBaseRent: cfg.baseRent,
        securityDeposit: cfg.deposit,
        description: `Spacious, fully maintained ${cfg.type.toLowerCase()} located in ${cfg.locality} with 24/7 power backup and dedicated parking.`,
        images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop'],
        availabilityStatus: 'Occupied',
        createdBy: adminUser._id,
      });

      properties.push(prop);
    }
    console.log(`[Seed] Successfully created ${properties.length} properties.`);

    // 6. 50 Tenants
    console.log('[Seed] Generating 50 Tenants...');
    const tenantNames = [
      { name: 'Amitabh Sen', father: 'Bimal Sen', email: 'amitabh.sen@example.com' },
      { name: 'Sunil Gavaskar', father: 'Manohar Gavaskar', email: 'sunil.g@example.com' },
      { name: 'Sneha Reddy', father: 'Venkat Reddy', email: 'sneha.reddy@example.com' },
      { name: 'Karthik Raman', father: 'S. Ramanathan', email: 'karthik.raman@example.com' },
      { name: 'Ananya Deshmukh', father: 'Pramod Deshmukh', email: 'ananya.d@example.com' },
      { name: 'Rohan Mehra', father: 'Deepak Mehra', email: 'rohan.m@example.com' },
      { name: 'Pooja Hegde', father: 'Manjunath Hegde', email: 'pooja.hegde@example.com' },
      { name: 'Arjun Kapoor', father: 'Boney Kapoor', email: 'arjun.k@example.com' },
      { name: 'Divya Iyer', father: 'K. S. Iyer', email: 'divya.iyer@example.com' },
      { name: 'Manish Tiwari', father: 'Rakesh Tiwari', email: 'manish.t@example.com' },
      { name: 'Neha Chawla', father: 'Surinder Chawla', email: 'neha.c@example.com' },
      { name: 'Gaurav Bhatia', father: 'Vinod Bhatia', email: 'gaurav.b@example.com' },
      { name: 'Tanvi Nair', father: 'Gopal Nair', email: 'tanvi.nair@example.com' },
      { name: 'Aditya Birla', father: 'Kumar Birla', email: 'aditya.b@example.com' },
      { name: 'Shreya Ghoshal', father: 'Bishwajit Ghoshal', email: 'shreya.g@example.com' },
      { name: 'Deepak Verma', father: 'Satish Verma', email: 'deepak.v@example.com' },
      { name: 'Kavita Menon', father: 'Narayanan Menon', email: 'kavita.m@example.com' },
      { name: 'Sanjay Dutt', father: 'Sunil Dutt', email: 'sanjay.d@example.com' },
      { name: 'Radhika Apte', father: 'Charudutt Apte', email: 'radhika.a@example.com' },
      { name: 'Varun Dhawan', father: 'David Dhawan', email: 'varun.d@example.com' },
      { name: 'Meera Nambiar', father: 'P. Nambiar', email: 'meera.n@example.com' },
      { name: 'Abhishek Roy', father: 'Subhas Roy', email: 'abhishek.r@example.com' },
      { name: 'Swati Agarwal', father: 'Mukesh Agarwal', email: 'swati.a@example.com' },
      { name: 'Prateek Kuhad', father: 'Ashok Kuhad', email: 'prateek.k@example.com' },
      { name: 'Ritu Phogat', father: 'Mahavir Phogat', email: 'ritu.p@example.com' },
      { name: 'Vivek Oberoi', father: 'Suresh Oberoi', email: 'vivek.o@example.com' },
      { name: 'Nandini Das', father: 'Soumitra Das', email: 'nandini.d@example.com' },
      { name: 'Harish Kalyan', father: 'Srinivasan Kalyan', email: 'harish.k@example.com' },
      { name: 'Pallavi Joshi', father: 'Madhukar Joshi', email: 'pallavi.j@example.com' },
      { name: 'Chetan Bhagat', father: 'Y. N. Bhagat', email: 'chetan.b@example.com' },
      { name: 'Aparna Sen', father: 'Chidananda Dasgupta', email: 'aparna.s@example.com' },
      { name: 'Kunal Nayyar', father: 'Rakesh Nayyar', email: 'kunal.n@example.com' },
      { name: 'Farhan Akhtar', father: 'Javed Akhtar', email: 'farhan.a@example.com' },
      { name: 'Zoya Akhtar', father: 'Javed Akhtar', email: 'zoya.a@example.com' },
      { name: 'Nikhil Kamath', father: 'Raghuram Kamath', email: 'nikhil.k@example.com' },
      { name: 'Nithin Kamath', father: 'Raghuram Kamath', email: 'nithin.k@example.com' },
      { name: 'Bhavish Aggarwal', father: 'Naresh Aggarwal', email: 'bhavish.a@example.com' },
      { name: 'Falguni Nayar', father: 'Manhar Nayar', email: 'falguni.n@example.com' },
      { name: 'Vijay Shekhar', father: 'Sulom Shekhar', email: 'vijay.s@example.com' },
      { name: 'Kiran Mazumdar', father: 'Rasendra Mazumdar', email: 'kiran.m@example.com' },
      { name: 'Azim Premji', father: 'Mohamed Premji', email: 'azim.p@example.com' },
      { name: 'Sudha Murty', father: 'R. H. Kulkarni', email: 'sudha.m@example.com' },
      { name: 'Narayana Murthy', father: 'N. R. Rama Rao', email: 'narayana.m@example.com' },
      { name: 'Rohit Sharma', father: 'Gurnath Sharma', email: 'rohit.s@example.com' },
      { name: 'Virat Kohli', father: 'Prem Kohli', email: 'virat.k@example.com' },
      { name: 'Jasprit Bumrah', father: 'Jasbir Singh', email: 'jasprit.b@example.com' },
      { name: 'Ravindra Jadeja', father: 'Anirudh Jadeja', email: 'ravindra.j@example.com' },
      { name: 'Hardik Pandya', father: 'Himanshu Pandya', email: 'hardik.p@example.com' },
      { name: 'Smriti Mandhana', father: 'Shrinivas Mandhana', email: 'smriti.m@example.com' },
      { name: 'Harmanpreet Kaur', father: 'Harmandar Singh', email: 'harmanpreet.k@example.com' },
    ];

    const tenants = [];
    for (let i = 0; i < 50; i++) {
      const tInfo = tenantNames[i];
      const prop = properties[i];
      const tenantId = `TEN-${1001 + i}`;
      const phoneDigits = String(9845000000 + i * 137).slice(-10);

      const tenant = await Tenant.create({
        tenantId,
        fullName: tInfo.name,
        fatherName: tInfo.father,
        mobileNumber: `+91 ${phoneDigits}`,
        whatsappNumber: `+91 ${phoneDigits}`,
        email: tInfo.email,
        aadhaarNumber: `XXXX-XXXX-${String(1000 + i).slice(-4)}`,
        panNumber: `ABCDE${1000 + i}F`,
        permanentAddress: {
          fullAddress: `House No. ${12 + i}, Sector ${1 + (i % 7)}, HSR Layout`,
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560102',
        },
        idProofDocument: {
          docType: 'Aadhaar',
          docNumber: `9876-${1000 + i}`,
          docUrl: '',
        },
        profileImage: '',
        assignedPropertyId: prop._id,
        assignedOwnerId: prop.ownerId,
        securityDepositPaid: prop.securityDeposit,
        status: 'Active',
        createdBy: adminUser._id,
      });

      // Update property link
      prop.currentTenantId = tenant._id;
      await prop.save();

      tenants.push(tenant);
    }
    console.log(`[Seed] Created ${tenants.length} tenants.`);

    // 7. 50 Rental Agreements (11-month leases)
    console.log('[Seed] Generating 50 Rental Agreements...');
    const agreements = [];
    for (let i = 0; i < 50; i++) {
      const prop = properties[i];
      const tenant = tenants[i];
      const agreementNumber = `AGR-2026-${String(i + 1).padStart(3, '0')}`;

      // Stagger start dates throughout 2026
      // Some started early 2026 (expiring soon or active), some mid-year
      const startMonth = (i % 10); // 0 to 9 (Jan to Oct 2026)
      const startDate = new Date(2026, startMonth, 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 11); // 11-month lease
      endDate.setDate(endDate.getDate() - 1);

      // Check if expiring within 30 days of Nov 2026
      const isExpiring = (endDate <= new Date(2026, 11, 20) && endDate >= new Date(2026, 10, 1));

      const agreement = await Agreement.create({
        agreementNumber,
        propertyId: prop._id,
        ownerId: prop.ownerId,
        tenantId: tenant._id,
        agreementStartDate: startDate,
        agreementEndDate: endDate,
        agreementDuration: 11,
        monthlyRent: prop.monthlyBaseRent,
        securityDeposit: prop.securityDeposit,
        rentGenerationDay: 1,
        monthlyDueDate: 10,
        gracePeriod: 3,
        fineType: 'per_day',
        fineValue: 100,
        maxFineLimit: 2000,
        rentIncrementPercentage: 10,
        renewalConditions: 'Standard 11-month lease renewal with 10% rent escalation subject to mutual agreement.',
        status: isExpiring ? 'Expiring' : 'Active',
        createdBy: adminUser._id,
      });

      prop.currentAgreementId = agreement._id;
      await prop.save();

      agreements.push(agreement);
    }
    console.log(`[Seed] Created ${agreements.length} rental agreements.`);

    // 8. Generate Invoices for 2026-10 and 2026-11
    console.log('[Seed] Generating Rent Invoices, Payments, Receipts and Ledgers...');
    const invoiceMonths = ['2026-10', '2026-11'];
    let paymentCounter = 1;
    let receiptCounter = 1;

    for (const monthStr of invoiceMonths) {
      const isCurrentMonth = monthStr === '2026-11';

      for (let i = 0; i < 50; i++) {
        const prop = properties[i];
        const tenant = tenants[i];
        const agreement = agreements[i];

        const [yStr, mStr] = monthStr.split('-');
        const invoiceNumber = `INV-${yStr}${mStr}-${String(i + 1).padStart(4, '0')}`;
        const dueDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 10, 23, 59, 59);

        // Determine realistic distribution:
        // In previous month (2026-10): mostly Paid, a few Overdue
        // In current month (2026-11): some Paid, some Unpaid, some Overdue with fines
        let status = 'Unpaid';
        let amountPaid = 0;
        let lateFine = 0;
        let paidDate = null;

        if (!isCurrentMonth) {
          // 2026-10: 90% paid, 10% overdue
          if (i % 10 !== 0) {
            status = 'Paid';
            amountPaid = prop.monthlyBaseRent;
            paidDate = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 8);
          } else {
            status = 'Overdue';
            lateFine = 1200; // 12 days late * 100
          }
        } else {
          // 2026-11 (Current month: today is Nov 20, 2026, due date was Nov 10, grace ended Nov 13)
          if (i % 3 === 0) {
            // Paid on time
            status = 'Paid';
            amountPaid = prop.monthlyBaseRent;
            paidDate = new Date(2026, 10, 7);
          } else if (i % 3 === 1) {
            // Overdue with late fine (today Nov 20 - dueDate Nov 10 = 10 days late. Grace 3 days -> 7 chargeable days = ₹700)
            status = 'Overdue';
            lateFine = 700;
          } else {
            // Unpaid
            status = 'Unpaid';
            lateFine = 0;
          }
        }

        const totalPayable = prop.monthlyBaseRent + lateFine;
        const balanceAmount = status === 'Paid' ? 0 : totalPayable;
        const paymentToken = generateSecureToken(32);

        const invoice = await RentInvoice.create({
          invoiceNumber,
          invoiceMonth: monthStr,
          agreementId: agreement._id,
          tenantId: tenant._id,
          propertyId: prop._id,
          ownerId: prop.ownerId,
          baseRent: prop.monthlyBaseRent,
          proratedRent: 0,
          isProrated: false,
          previousOutstanding: 0,
          lateFine,
          otherCharges: 0,
          discount: 0,
          totalPayable,
          amountPaid,
          balanceAmount,
          dueDate,
          paymentStatus: status,
          paymentToken,
          paymentTokenExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          paidDate,
          createdBy: adminUser._id,
        });

        // If Paid, create Payment, Receipt, and OwnerLedger entry
        if (status === 'Paid') {
          const paymentNumber = `PAY-2026${mStr}-${String(paymentCounter++).padStart(4, '0')}`;
          const rzpPaymentId = `pay_sim_${Date.now()}_${paymentCounter}`;

          const payment = await Payment.create({
            paymentNumber,
            invoiceId: invoice._id,
            agreementId: agreement._id,
            tenantId: tenant._id,
            propertyId: prop._id,
            ownerId: prop.ownerId,
            amount: amountPaid,
            baseRentPortion: amountPaid,
            finePortion: 0,
            otherChargesPortion: 0,
            paymentMethod: i % 2 === 0 ? 'upi' : 'netbanking',
            razorpayOrderId: `order_sim_${invoice.invoiceNumber}`,
            razorpayPaymentId: rzpPaymentId,
            gatewayFee: Math.round(amountPaid * 0.02),
            status: 'captured',
            paymentDate: paidDate || new Date(),
            verifiedBy: 'razorpay_checkout',
          });

          const receiptNumber = `REC-2026${mStr}-${String(receiptCounter++).padStart(4, '0')}`;
          const receipt = await Receipt.create({
            receiptNumber,
            paymentId: payment._id,
            invoiceId: invoice._id,
            tenantId: tenant._id,
            propertyId: prop._id,
            ownerId: prop.ownerId,
            receiptDate: paidDate || new Date(),
            tenantName: tenant.fullName,
            propertyName: `${prop.propertyName} (${prop.propertyNumber})`,
            propertyAddress: prop.address.fullAddress,
            ownerName: owners.find(o => o._id.toString() === prop.ownerId.toString())?.name || 'Owner',
            invoiceNumber: invoice.invoiceNumber,
            invoiceMonth: invoice.invoiceMonth,
            baseRent: invoice.baseRent,
            lateFine: 0,
            otherCharges: 0,
            discount: 0,
            totalPaid: amountPaid,
            paymentMethod: payment.paymentMethod.toUpperCase(),
            transactionId: rzpPaymentId,
            isDuplicate: false,
          });

          payment.receiptId = receipt._id;
          await payment.save();

          // Owner Ledger entry
          const lastLedger = await OwnerLedger.findOne({ ownerId: prop.ownerId }).sort({ createdAt: -1 });
          const prevBalance = lastLedger ? lastLedger.balanceAfter : 0;
          const newBalance = prevBalance + amountPaid;

          await OwnerLedger.create({
            ownerId: prop.ownerId,
            transactionType: 'rent_credit',
            invoiceId: invoice._id,
            paymentId: payment._id,
            amount: amountPaid,
            balanceAfter: newBalance,
            description: `Rent payment collected for ${invoice.invoiceNumber} via ${payment.paymentMethod.toUpperCase()}`,
            status: 'completed',
          });
        }
      }
    }

    // 9. Initial Owner Settlements (Sample historical settlements)
    console.log('[Seed] Creating sample owner settlements...');
    for (const owner of owners) {
      const ledgerEntries = await OwnerLedger.find({ ownerId: owner._id, transactionType: 'rent_credit' });
      const totalCollected = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);

      if (totalCollected > 0) {
        const settleAmount = Math.round(totalCollected * 0.6); // Settle 60% of collected rent
        const settlementNumber = `SET-202611-${String(Math.floor(1000 + Math.random() * 9000))}`;

        const settlement = await Settlement.create({
          settlementNumber,
          ownerId: owner._id,
          amount: settleAmount,
          method: 'manual_bank_transfer',
          bankReferenceNumber: `UTR_HDFC_${Date.now()}_${owner.ownerCode}`,
          status: 'settled',
          settledAt: new Date(2026, 10, 15),
          notes: 'Routine mid-month rental income disbursement to owner registered bank account.',
          createdBy: adminUser._id,
        });

        const lastLedger = await OwnerLedger.findOne({ ownerId: owner._id }).sort({ createdAt: -1 });
        const prevBal = lastLedger ? lastLedger.balanceAfter : 0;

        await OwnerLedger.create({
          ownerId: owner._id,
          transactionType: 'settlement_payout',
          settlementId: settlement._id,
          amount: -settleAmount,
          balanceAfter: prevBal - settleAmount,
          description: `Disbursed rental income [${settlementNumber}] via NEFT/RTGS to ${owner.bankDetails.bankName}`,
          status: 'completed',
        });
      }
    }

    console.log('========================================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');
    console.log('Summary of Seeded Data:');
    console.log(`- Owners: ${owners.length}`);
    console.log(`- Properties: ${properties.length}`);
    console.log(`- Tenants: ${tenants.length}`);
    console.log(`- Agreements: ${agreements.length}`);
    console.log(`- Invoices: ${await RentInvoice.countDocuments()}`);
    console.log(`- Payments: ${await Payment.countDocuments()}`);
    console.log(`- Receipts: ${await Receipt.countDocuments()}`);
    console.log(`- Ledgers: ${await OwnerLedger.countDocuments()}`);
    console.log('========================================================================');
    console.log('DEMO LOGIN CREDENTIALS:');
    console.log('1. Super Admin: admin@propertyerp.com / Admin@12345');
    console.log('2. Owner 1 (Rajesh Sharma): rajesh.sharma@example.com / Owner@12345');
    console.log('3. Owner 2 (Priya Patel): priya.patel@example.com / Owner@12345');
    console.log('4. Owner 3 (Vikram Malhotra): vikram.malhotra@example.com / Owner@12345');
    console.log('5. Staff Manager: manager@propertyerp.com / Staff@12345');
    console.log('========================================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]', error);
    process.exit(1);
  }
};

seedDatabase();
