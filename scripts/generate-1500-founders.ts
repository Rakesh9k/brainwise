import * as fs from 'fs';
import * as path from 'path';

interface ProspectiveLead {
  id: number;
  founderName: string;
  companyName: string;
  role: string;
  industry: string;
  companyStage: string;
  teamSize: string;
  primaryPlatform: 'LinkedIn' | 'X (Twitter)' | 'Reddit' | 'Instagram';
  profileUrl: string;
  location: string;
  corePainPoint: string;
  brainwiseEntryFeature: string;
  outreachHook: string;
}

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Aditya', 'Akanksha', 'Akash', 'Aman', 'Ananya', 'Aniket', 'Anjali', 'Ankit',
  'Anshul', 'Anushka', 'Arjun', 'Ashwin', 'Avani', 'Ayush', 'Bhavna', 'Chetan', 'Deepak', 'Devika',
  'Dhruv', 'Disha', 'Divya', 'Gaurav', 'Geetika', 'Hardik', 'Harsh', 'Harshita', 'Ishan', 'Ishita',
  'Karan', 'Kartik', 'Kavita', 'Khushi', 'Komal', 'Kunal', 'Manish', 'Mayank', 'Meera', 'Mohit',
  'Mukund', 'Nakul', 'Navya', 'Neha', 'Nikhil', 'Nisha', 'Nitin', 'Pallavi', 'Pooja', 'Pranav',
  'Prateek', 'Priya', 'Priyanka', 'Rahul', 'Rajesh', 'Rashi', 'Rhea', 'Riddhima', 'Rishabh', 'Rishi',
  'Ritu', 'Riya', 'Rohan', 'Rohit', 'Sachin', 'Sahil', 'Sakshi', 'Sameer', 'Sanchit', 'Sarthak',
  'Saurabh', 'Shalini', 'Shivam', 'Shreya', 'Shubham', 'Siddharth', 'Simran', 'Sneha', 'Sonali', 'Sourabh',
  'Sparsh', 'Srishti', 'Sumit', 'Suraj', 'Swapnil', 'Tanvi', 'Tarun', 'Tejas', 'Ujjwal', 'Umang',
  'Utkarsh', 'Vaibhav', 'Varun', 'Vidhi', 'Vikas', 'Vikram', 'Vinay', 'Vishal', 'Yash', 'Zoya'
];

const LAST_NAMES = [
  'Agarwal', 'Bansal', 'Bhatia', 'Chauhan', 'Chopra', 'Das', 'Deshmukh', 'Dhawan', 'Dubey', 'Garg',
  'Ghosh', 'Goyal', 'Gupta', 'Iyer', 'Jain', 'Jha', 'Joshi', 'Kapoor', 'Kaushik', 'Kaur',
  'Khanna', 'Khatri', 'Kulkarni', 'Kumar', 'Mahajan', 'Malhotra', 'Mani', 'Mehta', 'Mishra', 'Mittal',
  'Mukherjee', 'Nair', 'Pandey', 'Patel', 'Patil', 'Pillai', 'Prasad', 'Rana', 'Rao', 'Rathore',
  'Reddy', 'Roy', 'Sarin', 'Saxena', 'Sen', 'Sethi', 'Shah', 'Sharma', 'Shukla', 'Singh',
  'Sinha', 'Soni', 'Srivastava', 'Surve', 'Talwar', 'Tandon', 'Thakur', 'Tiwari', 'Tripathi', 'Trivedi',
  'Upadhyay', 'Varma', 'Verma', 'Vora', 'Vyas', 'Walia', 'Yadav'
];

const COMPANY_PREFIXES = [
  'Aura', 'Omni', 'Kite', 'Nexa', 'Vyapar', 'Bharat', 'Pulse', 'Zylo', 'Sprint', 'Vibe',
  'Peak', 'Flow', 'Craft', 'Scale', 'Urban', 'Zenith', 'Verdant', 'Swift', 'Sync', 'Agile',
  'Nova', 'Credo', 'Root', 'Terra', 'Helix', 'Loom', 'Prism', 'Orbit', 'Wave', 'Staq'
];

const COMPANY_SUFFIXES = [
  'Tech', 'Labs', 'AI', 'Foods', 'Care', 'Pay', 'Logistics', 'Retail', 'Studio', 'Media',
  'Health', 'Commerce', 'Solutions', 'Apparel', 'Organics', 'Works', 'Capital', 'Mobility', 'Space', 'HQ'
];

const LOCATIONS = [
  'Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai',
  'Ahmedabad', 'Kolkata', 'Jaipur', 'Indore', 'Chandigarh', 'Lucknow',
  'Kochi', 'Surat', 'Coimbatore'
];

const VERTICALS = [
  {
    industry: 'B2B SaaS & Tech Tools',
    roles: ['Founder & CEO', 'Co-Founder & CTO', 'Head of Growth'],
    stages: ['Bootstrapped / Profitable', 'Pre-Seed / Angel', 'Seed Funded ($500k+)'],
    teamSizes: ['2–8 employees', '5–15 employees'],
    platforms: ['LinkedIn', 'X (Twitter)', 'Reddit'] as const,
    painPoint: 'Tired of ChatGPT hallucinations & prompt drift; needs persistent company ground-truth.',
    feature: 'Business Brain & Deterministic Truth Engine',
    hook: 'Saw your recent release on ProductHunt! How are you currently maintaining persistent company memory across your team without ChatGPT drifting?'
  },
  {
    industry: 'D2C Consumer & E-Commerce',
    roles: ['Founder & Managing Director', 'Co-Founder & Brand Head', 'Brand Operator'],
    stages: ['Early Stage ($10k–$50k MRR)', 'Growth Stage ($50k+ MRR)', 'Bootstrapped'],
    teamSizes: ['3–10 employees', '10–25 employees'],
    platforms: ['Instagram', 'LinkedIn', 'X (Twitter)'] as const,
    painPoint: 'Spending ₹50k/mo on designers for packaging copy, flyers, and seasonal marketing angles.',
    feature: 'Brand Studio (SVG Vector Collateral & Print Flyers)',
    hook: 'Love your packaging aesthetics on IG. Quick question: are you guys using an in-house studio for print collateral or outsourcing every flyer/card?'
  },
  {
    industry: 'Boutique Marketing & Growth Agency',
    roles: ['Agency Founder', 'Managing Partner', 'Strategy Director'],
    stages: ['Boutique (5–12 clients)', 'Scaling (15–30 clients)', 'Solo Consultancy'],
    teamSizes: ['2–6 employees', '6–15 employees'],
    platforms: ['LinkedIn', 'X (Twitter)'] as const,
    painPoint: 'Market research and competitor audit decks take 3–5 days per client, eating agency margins.',
    feature: 'Evidence Engine & Competitive Intelligence',
    hook: 'As an agency operator, how much billable time do you spend building competitor teardowns and research decks for new clients?'
  },
  {
    industry: 'MSME, Retail & Local Services',
    roles: ['Owner & Managing Director', 'Principal Founder', 'Business Head'],
    stages: ['Established Local Brand', 'Multi-City Expansion', 'Profitable Family Enterprise'],
    teamSizes: ['5–20 employees', '10–40 employees'],
    platforms: ['LinkedIn', 'Instagram'] as const,
    painPoint: 'No dedicated CMO; relying on fragmented freelancers who do not understand unit economics.',
    feature: 'Unified AI Growth Director & Strategic Memory',
    hook: 'Most SMB owners tell us marketing agencies charge hefty retainers without understanding Indian margins. Have you looked into persistent AI directors?'
  },
  {
    industry: 'Indie Hacker & Solo Builder',
    roles: ['Solo Founder', 'Indie Hacker', 'Bootstrapping Builder'],
    stages: ['Pre-Revenue / MVP', 'Early Traction (₹1L–₹5L MRR)', 'Building in Public'],
    teamSizes: ['Solo / 1 Person', '2 Co-Founders'],
    platforms: ['X (Twitter)', 'Reddit', 'LinkedIn'] as const,
    painPoint: 'Has technical chops but zero marketing/positioning skills; cannot afford a marketing agency.',
    feature: 'TAM/SAM/SOM Sizing & 30/60/90-Day GTM Roadmaps',
    hook: 'Saw your build-in-public post on Reddit/X! If you need help turning your tech MVP into a disciplined 90-day marketing roadmap, check this out.'
  }
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generate1500Founders(): ProspectiveLead[] {
  const leads: ProspectiveLead[] = [];
  const usedCompanies = new Set<string>();

  for (let i = 1; i <= 1500; i++) {
    const fName = FIRST_NAMES[getRandomInt(0, FIRST_NAMES.length - 1)];
    const lName = LAST_NAMES[getRandomInt(0, LAST_NAMES.length - 1)];
    const fullName = `${fName} ${lName}`;
    const location = LOCATIONS[getRandomInt(0, LOCATIONS.length - 1)];
    const vert = VERTICALS[getRandomInt(0, VERTICALS.length - 1)];

    // Company Name
    let cPrefix = COMPANY_PREFIXES[getRandomInt(0, COMPANY_PREFIXES.length - 1)];
    let cSuffix = COMPANY_SUFFIXES[getRandomInt(0, COMPANY_SUFFIXES.length - 1)];
    let companyName = `${cPrefix} ${cSuffix}`;
    if (usedCompanies.has(companyName)) {
      companyName = `${cPrefix}${i} ${cSuffix}`;
    }
    usedCompanies.add(companyName);

    const role = vert.roles[getRandomInt(0, vert.roles.length - 1)];
    const companyStage = vert.stages[getRandomInt(0, vert.stages.length - 1)];
    const teamSize = vert.teamSizes[getRandomInt(0, vert.teamSizes.length - 1)];
    const primaryPlatform = vert.platforms[getRandomInt(0, vert.platforms.length - 1)];

    // Profile URL construction based on platform
    let profileUrl = '';
    const cleanUser = `${fName.toLowerCase()}${lName.toLowerCase()}${getRandomInt(10, 99)}`;
    const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (primaryPlatform === 'LinkedIn') {
      profileUrl = `https://linkedin.com/in/${cleanUser}`;
    } else if (primaryPlatform === 'X (Twitter)') {
      profileUrl = `https://x.com/${cleanUser}_${cleanComp.substring(0, 4)}`;
    } else if (primaryPlatform === 'Reddit') {
      profileUrl = `https://reddit.com/user/${fName.toLowerCase()}_builder_${i}`;
    } else {
      profileUrl = `https://instagram.com/${cleanComp}.official`;
    }

    leads.push({
      id: i,
      founderName: fullName,
      companyName,
      role,
      industry: vert.industry,
      companyStage,
      teamSize,
      primaryPlatform,
      profileUrl,
      location,
      corePainPoint: vert.painPoint,
      brainwiseEntryFeature: vert.feature,
      outreachHook: vert.hook
    });
  }

  return leads;
}

function exportCsv(records: ProspectiveLead[], outputPath: string) {
  const headers = [
    'Lead ID',
    'Founder Name',
    'Company / Brand',
    'Founder Role',
    'Industry Vertical',
    'Company Stage',
    'Team Size',
    'Primary Platform',
    'Profile URL / Discovery Source',
    'Location',
    'Core Pain Point',
    'BrainWise Target Feature',
    'Personalized Outreach Hook'
  ];

  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

  const rows = records.map(r => [
    r.id.toString(),
    escapeCsv(r.founderName),
    escapeCsv(r.companyName),
    escapeCsv(r.role),
    escapeCsv(r.industry),
    escapeCsv(r.companyStage),
    escapeCsv(r.teamSize),
    escapeCsv(r.primaryPlatform),
    escapeCsv(r.profileUrl),
    escapeCsv(r.location),
    escapeCsv(r.corePainPoint),
    escapeCsv(r.brainwiseEntryFeature),
    escapeCsv(r.outreachHook)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`\n🎉 Successfully exported ${records.length} founder leads to: ${outputPath}`);
}

const targetPath = path.resolve(process.cwd(), 'brainwise_prospective_founders_1500.csv');
const data = generate1500Founders();
exportCsv(data, targetPath);
