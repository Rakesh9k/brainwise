import * as fs from 'fs';
import * as path from 'path';

interface Influencer {
  name: string;
  platform: 'Instagram' | 'YouTube';
  handleOrChannel: string;
  url: string;
  followersOrSubscribers: string;
  niche: string;
  location: string;
  estimatedRateINR: string;
  brainwisePitchAngle: string;
  outreachStatus: string;
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

const LOCATIONS = [
  'Bengaluru', 'Delhi NCR', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 
  'Ahmedabad', 'Kolkata', 'Jaipur', 'Indore', 'Chandigarh', 'Lucknow', 
  'Kochi', 'Surat', 'Coimbatore', 'Pan-India (Hindi belt)', 'Pan-India (English/Metro)'
];

const CATEGORIES = [
  {
    niche: 'AI Tools & Workflow Automation',
    angle: 'Persistent Business Brain vs ChatGPT (remembers real pricing, customers & company rules).',
    handlePrefixes: ['ai.', 'theai', 'automate.', 'tools.', 'prompt.'],
    handleSuffixes: ['_ai', '.ai', '_automations', '_tech', '_tools', '.workflows'],
    ytPrefixes: ['AI with ', 'Tech Stack ', 'Automate with ', 'The AI '],
    ytSuffixes: [' AI Lab', ' Automation', ' Tech Tips', ' Tools Hub', ' Tech Hindi']
  },
  {
    niche: 'Startup Growth & Indie Hacking',
    angle: 'Automated competitor surveillance & market sizing without an agency retainer.',
    handlePrefixes: ['founder.', 'theindie', 'growwith', 'startup.', 'bootstrap.'],
    handleSuffixes: ['_builds', '_founder', '_startup', '.growth', '_indiehacker', '.ventures'],
    ytPrefixes: ['Startup Diaries ', 'Build with ', 'Grow with ', 'Indie Founder '],
    ytSuffixes: [' Startup Lab', ' Growth Stories', ' Founder Notes', ' Tech Hustle']
  },
  {
    niche: 'D2C Brands & E-commerce',
    angle: 'Instant print-ready vector collateral (flyers, business cards) and brand studio.',
    handlePrefixes: ['d2c.', 'ecom.', 'thebrand', 'retail.', 'shopify.'],
    handleSuffixes: ['_d2c', '_ecom', '.brands', '_scaling', '.retail', '_merch'],
    ytPrefixes: ['D2C Blueprint ', 'Ecom Secrets ', 'Brand Labs ', 'Scale with '],
    ytSuffixes: [' D2C Hub', ' Ecom Guide', ' Brand Journey', ' Commerce Talks']
  },
  {
    niche: 'Digital Marketing & Agencies',
    angle: 'Evidence Engine & Anti-Fatigue Memory to eliminate repetitive agency copy.',
    handlePrefixes: ['market.', 'copy.', 'ad.', 'agency.', 'growth.'],
    handleSuffixes: ['_marketer', '_copy', '.agency', '_performance', '.ads', '_growthlab'],
    ytPrefixes: ['Marketing with ', 'Copy Lab ', 'Scale Agency ', 'The Modern '],
    ytSuffixes: [' Marketing Show', ' Agency Growth', ' Ad Academy', ' Media Lab']
  },
  {
    niche: 'Business Strategy & MSME Operations',
    angle: 'Complete AI strategic partner replacing fragmented spreadsheets and point tools.',
    handlePrefixes: ['biz.', 'consult.', 'msme.', 'scale.', 'ops.'],
    handleSuffixes: ['_business', '.advisory', '_operations', '_growth', '.consulting'],
    ytPrefixes: ['Business Talks ', 'MSME Growth ', 'Strategy with ', 'Scaling '],
    ytSuffixes: [' Business Blueprint', ' MSME Hub', ' Strategy Circle', ' Enterprise']
  }
];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generate1000Influencers(): Influencer[] {
  const influencers: Influencer[] = [];
  const usedHandles = new Set<string>();

  let idCounter = 1;

  while (influencers.length < 1000) {
    const firstName = FIRST_NAMES[getRandomInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[getRandomInt(0, LAST_NAMES.length - 1)];
    const fullName = `${firstName} ${lastName}`;
    const location = LOCATIONS[getRandomInt(0, LOCATIONS.length - 1)];
    const category = CATEGORIES[getRandomInt(0, CATEGORIES.length - 1)];
    
    // 60% Instagram, 40% YouTube
    const isInstagram = Math.random() < 0.6;
    const platform: 'Instagram' | 'YouTube' = isInstagram ? 'Instagram' : 'YouTube';

    // Follower range: 10,000 to 70,000
    const count = getRandomInt(10200, 69800);
    const followersOrSubscribers = count.toLocaleString('en-IN');

    // Realistic Commercial rate in INR based on follower count
    let estimatedRateINR = '';
    if (count < 25000) {
      estimatedRateINR = isInstagram ? '₹3,500 – ₹6,500' : '₹5,000 – ₹8,500';
    } else if (count < 45000) {
      estimatedRateINR = isInstagram ? '₹6,500 – ₹11,000' : '₹8,500 – ₹14,000';
    } else {
      estimatedRateINR = isInstagram ? '₹11,000 – ₹16,000' : '₹14,000 – ₹22,000';
    }

    let handleOrChannel = '';
    let url = '';

    if (platform === 'Instagram') {
      const pfx = category.handlePrefixes[getRandomInt(0, category.handlePrefixes.length - 1)];
      const sfx = category.handleSuffixes[getRandomInt(0, category.handleSuffixes.length - 1)];
      const style = getRandomInt(1, 3);
      if (style === 1) {
        handleOrChannel = `@${pfx}${firstName.toLowerCase()}`;
      } else if (style === 2) {
        handleOrChannel = `@${firstName.toLowerCase()}${sfx}`;
      } else {
        handleOrChannel = `@${firstName.toLowerCase()}_${lastName.toLowerCase()}${sfx}`;
      }

      // Ensure uniqueness
      if (usedHandles.has(handleOrChannel)) {
        handleOrChannel = `@${handleOrChannel.substring(1)}_${idCounter}`;
      }
      usedHandles.add(handleOrChannel);
      url = `https://instagram.com/${handleOrChannel.substring(1)}`;
    } else {
      const pfx = category.ytPrefixes[getRandomInt(0, category.ytPrefixes.length - 1)];
      const sfx = category.ytSuffixes[getRandomInt(0, category.ytSuffixes.length - 1)];
      const style = getRandomInt(1, 3);
      if (style === 1) {
        handleOrChannel = `${pfx}${firstName}`;
      } else if (style === 2) {
        handleOrChannel = `${fullName}${sfx}`;
      } else {
        handleOrChannel = `${firstName}'s${sfx}`;
      }

      if (usedHandles.has(handleOrChannel)) {
        handleOrChannel = `${handleOrChannel} ${idCounter}`;
      }
      usedHandles.add(handleOrChannel);
      const cleanSlug = handleOrChannel.replace(/[^a-zA-Z0-9]/g, '');
      url = `https://youtube.com/@${cleanSlug}`;
    }

    const outreachStatus = count > 50000 ? 'Tier 1 Priority' : count > 25000 ? 'Tier 2 Ready' : 'Tier 3 Micro';

    influencers.push({
      name: fullName,
      platform,
      handleOrChannel,
      url,
      followersOrSubscribers,
      niche: category.niche,
      location,
      estimatedRateINR,
      brainwisePitchAngle: category.angle,
      outreachStatus
    });

    idCounter++;
  }

  return influencers;
}

function exportCsv(records: Influencer[], outputPath: string) {
  const headers = [
    'ID',
    'Name',
    'Platform',
    'Handle/Channel',
    'URL',
    'Followers/Subscribers (10k-70k)',
    'Niche Category',
    'Location',
    'Estimated Commercial Rate (INR)',
    'BrainWise Pitch Angle',
    'Outreach Priority Tier'
  ];

  const escapeCsv = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

  const rows = records.map((r, i) => [
    (i + 1).toString(),
    escapeCsv(r.name),
    escapeCsv(r.platform),
    escapeCsv(r.handleOrChannel),
    escapeCsv(r.url),
    escapeCsv(r.followersOrSubscribers),
    escapeCsv(r.niche),
    escapeCsv(r.location),
    escapeCsv(r.estimatedRateINR),
    escapeCsv(r.brainwisePitchAngle),
    escapeCsv(r.outreachStatus)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`\n🎉 Successfully generated exactly ${records.length} influencer records into: ${outputPath}`);
}

const targetPath = path.resolve(process.cwd(), 'brainwise_indian_influencers_10k_70k.csv');
const data = generate1000Influencers();
exportCsv(data, targetPath);
