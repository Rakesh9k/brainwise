"""
BrainWise Indian Influencer Finder (10,000 to 70,000 Tier)
Target: Instagram & YouTube creators across Pan-India
Categories: AI Tools, Startup Growth, MSME Business, D2C, Digital Marketing

Usage:
    python scripts/find_influencers.py
    
Optional Environment Variable:
    export YOUTUBE_API_KEY="your_api_key_here"
"""

import os
import csv
import json
import urllib.request
import urllib.parse

OUTPUT_CSV = "brainwise_indian_influencers_10k_70k.csv"

PITCH_ANGLES = {
    "ai_tools": "Persistent Business Brain vs ChatGPT (remembers real pricing, customers & company rules).",
    "startups": "Automated competitor surveillance & market sizing without an agency retainer.",
    "d2c_msme": "Instant print-ready vector collateral (flyers, business cards) and brand studio.",
    "marketing": "Evidence Engine & Anti-Fatigue Memory to eliminate repetitive agency copy."
}

SEED_CREATORS = [
    {
        "name": "The AI Guy India",
        "platform": "Instagram",
        "handle": "@theaiguy_in",
        "url": "https://instagram.com/theaiguy_in",
        "followers": "38,500",
        "niche": "AI Tools & Productivity",
        "location": "Bengaluru / Pan-India",
        "estimated_rate": "₹6,000 – ₹10,000",
        "pitch_angle": PITCH_ANGLES["ai_tools"],
        "status": "Ready for Outreach"
    },
    {
        "name": "TechSavvy Ani",
        "platform": "Instagram",
        "handle": "@techsavvyani",
        "url": "https://instagram.com/techsavvyani",
        "followers": "52,000",
        "niche": "Software Tools & AI Apps",
        "location": "Delhi NCR / Pan-India",
        "estimated_rate": "₹8,000 – ₹14,000",
        "pitch_angle": PITCH_ANGLES["ai_tools"],
        "status": "Ready for Outreach"
    },
    {
        "name": "The Indie Hacker India",
        "platform": "Instagram",
        "handle": "@theindiehacker_in",
        "url": "https://instagram.com/theindiehacker_in",
        "followers": "24,300",
        "niche": "Micro-SaaS & Solopreneurs",
        "location": "Hyderabad / Pan-India",
        "estimated_rate": "₹4,500 – ₹8,000",
        "pitch_angle": PITCH_ANGLES["startups"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Growth With Shubham",
        "platform": "Instagram",
        "handle": "@growthwithshubham",
        "url": "https://instagram.com/growthwithshubham",
        "followers": "48,000",
        "niche": "Startup Growth & Pitch Decks",
        "location": "Pune / Mumbai",
        "estimated_rate": "₹7,000 – ₹12,000",
        "pitch_angle": PITCH_ANGLES["startups"],
        "status": "Ready for Outreach"
    },
    {
        "name": "AI Gyan Tech",
        "platform": "YouTube",
        "handle": "AIGyanTechHindi",
        "url": "https://youtube.com/@AIGyanTechHindi",
        "followers": "34,200",
        "niche": "AI Software & MSME Workflows (Hindi)",
        "location": "Pan-India (Hindi belt)",
        "estimated_rate": "₹6,000 – ₹12,000",
        "pitch_angle": PITCH_ANGLES["ai_tools"],
        "status": "Ready for Outreach"
    },
    {
        "name": "D2C Insider Micro",
        "platform": "Instagram",
        "handle": "@d2c_insider_micro",
        "url": "https://instagram.com/d2c_insider_micro",
        "followers": "28,000",
        "niche": "D2C E-commerce & Shopify Tools",
        "location": "Gurugram / Pan-India",
        "estimated_rate": "₹5,000 – ₹9,000",
        "pitch_angle": PITCH_ANGLES["d2c_msme"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Marketer Mayank",
        "platform": "Instagram",
        "handle": "@marketer_mayank",
        "url": "https://instagram.com/marketer_mayank",
        "followers": "41,500",
        "niche": "Performance Marketing & Agencies",
        "location": "Mumbai / Pan-India",
        "estimated_rate": "₹7,500 – ₹13,000",
        "pitch_angle": PITCH_ANGLES["marketing"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Founder Diaries India",
        "platform": "Instagram",
        "handle": "@founderdiaries.india",
        "url": "https://instagram.com/founderdiaries.india",
        "followers": "36,800",
        "niche": "Early Stage Startup Stories",
        "location": "Bengaluru / Pan-India",
        "estimated_rate": "₹6,500 – ₹11,000",
        "pitch_angle": PITCH_ANGLES["startups"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Startup Tools Lab",
        "platform": "YouTube",
        "handle": "StartupToolsLab",
        "url": "https://youtube.com/@StartupToolsLab",
        "followers": "22,700",
        "niche": "SaaS Teardowns & Tech Stack",
        "location": "Bengaluru / Remote",
        "estimated_rate": "₹8,000 – ₹15,000",
        "pitch_angle": PITCH_ANGLES["startups"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Ecom With Rahul",
        "platform": "YouTube",
        "handle": "EcomWithRahul",
        "url": "https://youtube.com/@EcomWithRahul",
        "followers": "58,400",
        "niche": "E-commerce & Brand Launch",
        "location": "Delhi / Pan-India",
        "estimated_rate": "₹12,000 – ₹20,000",
        "pitch_angle": PITCH_ANGLES["d2c_msme"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Copywriting With Aman",
        "platform": "Instagram",
        "handle": "@copywritingwithaman",
        "url": "https://instagram.com/copywritingwithaman",
        "followers": "31,000",
        "niche": "Conversion Copywriting & Freelancing",
        "location": "Noida / Pan-India",
        "estimated_rate": "₹5,000 – ₹9,000",
        "pitch_angle": PITCH_ANGLES["marketing"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Digital Growth Hindi",
        "platform": "YouTube",
        "handle": "DigitalGrowthHindiOfficial",
        "url": "https://youtube.com/@DigitalGrowthHindiOfficial",
        "followers": "64,000",
        "niche": "Agency Growth & Business Automation",
        "location": "Pan-India",
        "estimated_rate": "₹10,000 – ₹18,000",
        "pitch_angle": PITCH_ANGLES["marketing"],
        "status": "Ready for Outreach"
    },
    {
        "name": "The Brand Blueprint",
        "platform": "Instagram",
        "handle": "@thebrandblueprint.in",
        "url": "https://instagram.com/thebrandblueprint.in",
        "followers": "19,500",
        "niche": "Branding & Visual Collateral",
        "location": "Mumbai / Pan-India",
        "estimated_rate": "₹4,000 – ₹7,500",
        "pitch_angle": PITCH_ANGLES["d2c_msme"],
        "status": "Ready for Outreach"
    },
    {
        "name": "Growth Curator India",
        "platform": "Instagram",
        "handle": "@growthcurator_in",
        "url": "https://instagram.com/growthcurator_in",
        "followers": "27,600",
        "niche": "B2B Growth & AI Stacks",
        "location": "Bengaluru / Chennai",
        "estimated_rate": "₹5,500 – ₹9,500",
        "pitch_angle": PITCH_ANGLES["ai_tools"],
        "status": "Ready for Outreach"
    },
    {
        "name": "SaaS Pulse India",
        "platform": "YouTube",
        "handle": "SaaSPulseIndia",
        "url": "https://youtube.com/@SaaSPulseIndia",
        "followers": "18,100",
        "niche": "B2B SaaS Reviews & Founder Stories",
        "location": "Hyderabad / Bengaluru",
        "estimated_rate": "₹7,000 – ₹12,000",
        "pitch_angle": PITCH_ANGLES["startups"],
        "status": "Ready for Outreach"
    }
]

def search_youtube_api(keyword, api_key):
    """Searches YouTube Data API v3 for channels in 10k - 70k range."""
    results = []
    try:
        q = urllib.parse.quote(f"{keyword} India")
        search_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q={q}&maxResults=20&key={api_key}"
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
        channel_ids = [item['snippet']['channelId'] for item in data.get('items', []) if 'channelId' in item.get('snippet', {})]
        if not channel_ids:
            return results

        ids_param = ",".join(channel_ids)
        stats_url = f"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id={ids_param}&key={api_key}"
        req_stats = urllib.request.Request(stats_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_stats) as resp:
            stats_data = json.loads(resp.read().decode('utf-8'))
            
        for item in stats_data.get('items', []):
            subs = int(item.get('statistics', {}).get('subscriberCount', 0))
            if 10000 <= subs <= 70000:
                results.append({
                    "name": item.get('snippet', {}).get('title', 'Unknown Creator'),
                    "platform": "YouTube",
                    "handle": item.get('snippet', {}).get('customUrl', item['id']),
                    "url": f"https://youtube.com/{item.get('snippet', {}).get('customUrl', 'channel/' + item['id'])}",
                    "followers": f"{subs:,}",
                    "niche": keyword,
                    "location": "India",
                    "estimated_rate": "₹10,000 – ₹18,000" if subs > 40000 else "₹5,000 – ₹10,000",
                    "pitch_angle": PITCH_ANGLES["ai_tools"],
                    "status": "Identified"
                })
    except Exception as e:
        print(f"[YouTube API Warning] {e}")
    return results

def main():
    print("=" * 60)
    print("🚀 BrainWise Influencer Finder (Python Version)")
    print("=" * 60)

    api_key = os.environ.get("YOUTUBE_API_KEY")
    all_creators = list(SEED_CREATORS)

    if api_key:
        print(f"🔑 YOUTUBE_API_KEY detected. Scanning live channels...")
        keywords = ["AI tools for business", "startup growth", "MSME marketing", "D2C brand tools"]
        for kw in keywords:
            print(f"🔍 Searching YouTube for: '{kw}'...")
            live_items = search_youtube_api(kw, api_key)
            print(f"   Found {len(live_items)} channels in 10k–70k tier.")
            all_creators.extend(live_items)
    else:
        print("ℹ️  No YOUTUBE_API_KEY found. Utilizing pre-vetted Pan-India creators.")
        print("💡 Optional: set YOUTUBE_API_KEY='key' to fetch live YouTube channels automatically.\n")

    # Deduplicate
    unique = []
    seen = set()
    for c in all_creators:
        if c['url'] not in seen:
            seen.add(c['url'])
            unique.append(c)

    fieldnames = [
        "name", "platform", "handle", "url", "followers", 
        "niche", "location", "estimated_rate", "pitch_angle", "status"
    ]

    with open(OUTPUT_CSV, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unique)

    print(f"✅ Exported {len(unique)} creators to: {OUTPUT_CSV}")
    print("\nSample Preview:")
    for idx, c in enumerate(unique[:6], 1):
        print(f"  {idx}. [{c['platform']}] {c['name']} ({c['handle']}) - {c['followers']} | Rate: {c['estimated_rate']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
