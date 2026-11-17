"""Mock-data generator for Orbit. Run: python gen_mock.py

Everything is generated relative to today (or ORBIT_TODAY=YYYY-MM-DD), so the story always reads as "now".
The cast is fictional. To put real people in, copy local_roster.example.json to local_roster.json
(untracked) and map any cast member to a real name/email; the user's own name lives there too."""
import json
import os
import random
import re
from datetime import date, datetime, timedelta
from pathlib import Path

random.seed(7)
HERE = Path(__file__).parent
DATA = HERE / "data"
ROSTER = json.loads((HERE / "local_roster.json").read_text()) if (HERE / "local_roster.json").exists() else {}
TODAY = date.fromisoformat(os.environ["ORBIT_TODAY"]) if os.environ.get("ORBIT_TODAY") else date.today()
ME_NAME = ROSTER.get("me", {}).get("name") or os.environ.get("ORBIT_USER_NAME", "Robin")
ME = ROSTER.get("me", {}).get("email", "me@example.com")
WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def d(days_ago: int) -> date:
    return TODAY - timedelta(days=days_ago)


def on(days_ago: int) -> str:
    """'Nov 3' style date for a day relative to today (negative = upcoming)."""
    dt = d(days_ago)
    return f"{dt.strftime('%b')} {dt.day}"


# ---------------------------------------------------------------- contacts
P = {
    "teal": ["#CFF4F2", "#2E9FA6", "#0C3A44"],
    "seafoam": ["#D6F2EA", "#5FA89A", "#123A36"],
    "crimson": ["#FFB8BE", "#C4313B", "#3A0A12"],
    "rust": ["#EBC2B0", "#8A3A2A", "#240C08"],
    "copper": ["#F6CDB8", "#B5452E", "#3A140C"],
    "pink": ["#F6DCE6", "#C9779B", "#4A1E36"],
    "lavender": ["#E4DCF6", "#8C7AB8", "#2A2050"],
    "indigo": ["#C8D2F5", "#3A4E9A", "#0E1638"],
    "cream": ["#F6F0E8", "#CFC6BA", "#4A4440"],
}

FRIENDS = [
    # id, name, city, interests, cadence, palette, style, size, moon, angle hint
    ("priya", "Priya", "Berkeley", ["boba", "machine learning", "badminton", "bollywood"], 7, "seafoam", "cloudbands", 22, False, 222),
    ("sam", "Sam", "Berkeley", ["board games", "basketball", "running", "ramen"], 10, "teal", "continents", 25, True, 180),
    ("leo", "Leo", "San Francisco", ["baseball", "board games", "ramen", "film photography"], 14, "rust", "bands_spot", 24, False, 108),
    ("kai", "Kai", "Berkeley", ["robotics", "basketball", "espresso", "sci-fi"], 14, "indigo", "bands", 22, False, 262),
    ("nia", "Nia", "Oakland", ["ceramics", "farmers markets", "board games", "live music"], 21, "pink", "swirls", 23, False, 20),
    ("alex", "Alex", "Oakland", ["climbing", "bouldering", "basketball", "coffee"], 21, "crimson", "craters", 21, False, 152),
    ("lena", "Lena", "San Francisco", ["design", "art walks", "natural wine", "cycling"], 30, "copper", "swirls", 22, False, 78),
    ("maya", "Maya", "Berkeley", ["running", "ethiopian food", "fintech", "hiking"], 14, "lavender", "bands", 25, False, 318),
    ("jordan", "Jordan", "Oakland", ["jazz", "cooking", "vinyl", "hiking"], 21, "copper", "swirls", 23, False, 345),
    ("theo", "Theo", "Berkeley", ["robotics", "hiking", "chess", "espresso"], 21, "indigo", "bands", 23, True, 292),
    ("riya", "Riya", "Oakland", ["climbing", "bouldering", "dosa", "yoga"], 21, "seafoam", "cloudbands", 21, False, 50),
    ("ben", "Ben", "Seattle", ["hiking", "indie games", "coffee"], 120, "cream", "craters", 15, False, 240),
]

contacts = []
for fid, name, city, interests, cadence, pal, style, size, moon, angle in FRIENDS:
    contacts.append({
        "id": fid, "name": name, "email": f"{fid}@example.com", "city": city,
        "interests": interests, "cadence_days": cadence,
        "planet": {"palette": pal, "light": P[pal][0], "mid": P[pal][1], "dark": P[pal][2],
                   "style": style, "size": size, "moon": moon, "angle_hint": angle,
                   **({"continent": "#1D6B5E"} if fid == "sam" else {})},
    })
E = {c["id"]: c["email"] for c in contacts}

# ---------------------------------------------------------------- calendar
events = []


def ev(days_ago, title, who, place, hour=19, dur=2):
    start = datetime.combine(d(days_ago), datetime.min.time()).replace(hour=hour)
    events.append({
        "title": title, "start": start.isoformat(), "end": (start + timedelta(hours=dur)).isoformat(),
        "location": place, "attendees": [ME] + [E.get(w, w) for w in who],
    })


def series(days, titles, who, place, hour=19, dur=2):
    for i, da in enumerate(days):
        ev(da, titles[i % len(titles)], who, place, hour, dur)


# EECS study crew — Priya, Sam, Kai
series([16, 30, 44, 58, 72, 86], ["CS 189 study session", "CS 189 problem set grind", "Midterm review, Moffitt 4th floor"],
       ["priya", "sam", "kai"], "Moffitt Library", 16, 3)
# Priya — weekly-ish
series([3, 10, 24, 37, 52, 66, 94], ["Boba with Priya", "Badminton w/ Priya", "Lunch with Priya"], ["priya"], "Asha Tea House", 13, 1)
series([6, 20, 41], ["Boba run", "Late night ramen"], ["priya", "sam"], "Southside", 21, 1)
# Board game night — Sam, Leo, Nia, Priya
series([27, 55, 83, 111, 139], ["Board game night", "Catan rematch", "Board game night at Sam's"], ["sam", "leo", "nia", "priya"], "Sam's place", 19, 3)
# Sam extras
series([13, 76], ["Morning run with Sam", "Ramen with Sam"], ["sam"], "Berkeley Marina", 8, 1)
# Pickup basketball — Alex, Sam, Kai
series([36, 64, 99, 130], ["Pickup basketball", "RSF pickup"], ["alex", "sam", "kai"], "RSF", 18, 2)
# Alex
series([15, 50, 85], ["Climbing with Alex", "Bouldering + burritos w/ Alex"], ["alex"], "Pacific Pipe, Oakland", 18, 2)
# Kai
series([23, 51, 79], ["Espresso + robotics chat with Kai", "Kai — Dune rewatch"], ["kai"], "Caffe Strada", 15, 1)
# Leo
series([12, 40, 68, 103], ["Giants game with Leo", "Ramen with Leo", "Photo walk w/ Leo"], ["leo"], "San Francisco", 18, 3)
series([57, 92, 127], ["Dolores Park hang", "Wine bar in the Mission"], ["leo", "lena"], "Mission District, SF", 15, 3)
# Nia
series([50, 78, 122], ["First Fridays art walk", "Gallery opening"], ["nia", "lena"], "Telegraph Ave, Oakland", 18, 3)
series([20, 48], ["Grand Lake farmers market", "Ceramics open studio"], ["nia", "riya"], "Grand Lake, Oakland", 10, 2)
series([41, 90], ["Jazz at the Sound Room w/ Jordan", "Live music night w/ Jordan"], ["jordan"], "Uptown Oakland", 20, 3)
series([62, 146], ["Coffee with Nia"], ["nia"], "Oakland", 11, 1)
# Lena
series([106, 150], ["Lena — design show", "Bike ride w/ Lena"], ["lena"], "San Francisco", 11, 2)
# Riya
series([18, 46, 74], ["Dosa night", "Dosa + chai"], ["riya", "priya"], "Vik's Chaat", 19, 2)
series([60, 100], ["Yoga in the park w/ Riya"], ["riya"], "Lake Merritt", 9, 1)
# The Thursday dinner club — Maya, Jordan, Theo (all drifted since)
series([61, 75, 104, 132, 160], ["Thursday dinner club", "Dinner club — Jordan cooks", "Thursday dinner club"], ["maya", "jordan", "theo"], "Jordan's place, Oakland", 19, 3)
series([47, 118, 167], ["Tilden hike", "Mt. Tam sunrise hike"], ["maya", "jordan", "theo"], "Tilden Park", 9, 4)
# Theo + Kai (lab mates)
series([38, 67, 101], ["Robotics lab demo day", "Lab social"], ["theo", "kai"], "Cory Hall", 17, 2)
series([88, 141], ["Chess + espresso with Theo"], ["theo"], "Caffe Strada", 16, 1)
# Maya
series([34, 54, 82, 96, 124], ["Coffee with Maya", "Run + brunch w/ Maya", "Ethiopian dinner with Maya"], ["maya"], "Berkeley", 10, 2)
# Jordan
series([69, 111], ["Record shopping w/ Jordan", "Jordan — cooking night"], ["jordan"], "Oakland", 14, 2)
# Ben — two years back, before he moved to Seattle
ev(745, "Goodbye dinner before Ben moves to Seattle", ["ben"], "Jupiter, Berkeley", 19, 3)
ev(790, "Hiking Mt. Tam with Ben", ["ben"], "Mt. Tamalpais", 8, 6)

# Non-friend filler to reach 82 "plans" (each outside address appears once -> never a friend)
fillers = [
    (8, "Dentist", [], "Berkeley Dental", 9), (29, "EECS career fair", [], "MLK Student Union", 11),
    (43, "Office hours — CS 189", ["gsi.cs189@example.edu"], "Soda Hall", 14),
    (71, "Call with Mom", ["mom@example.com"], "Phone", 18), (97, "Hackathon kickoff", [], "Sutardja Dai Hall", 10),
    (115, "Internship offer call", ["recruiting@example.org"], "Zoom", 13), (136, "Apartment lease signing", [], "Northside", 12),
    (158, "Summer research check-in", ["advisor@example.edu"], "Cory Hall", 15), (171, "Haircut", [], "Telegraph Ave", 16),
    (178, "Finals week planning", [], "Moffitt Library", 20),
]
for da, title, who, place, hour in fillers:
    if len(events) >= 82:
        break
    ev(da, title, who, place, hour, 1)
assert len(events) == 82, len(events)
events.sort(key=lambda e: e["start"])
for i, e in enumerate(events):
    e["id"] = f"evt_{i + 1:03d}"

# ---------------------------------------------------------------- emails
threads = []


def th(days_ago, subject, frm, to, body, cc=()):
    g = lambda w: E.get(w, w if "@" in w else ME if w == "me" else w)
    threads.append({
        "date": d(days_ago).isoformat(), "subject": subject, "from": g(frm),
        "to": [g(x) for x in to], "cc": [g(x) for x in cc], "body": body,
    })


# --- life events (positive / neutral only)
th(13, "First day!!", "maya", ["me"], f"{ME_NAME}!! Today was my first day — I officially started at Stripe on {on(13)}. New job, new badge, same me. The onboarding is intense but the team is so kind. We HAVE to celebrate soon. Also still training for the Big Sur marathon in April, so no late Tuesdays for me. — Maya", cc=["jordan", "theo"])
th(5, f"Nia's birthday — {d(-4).strftime('%A')}!", "riya", ["me"], f"Reminder that Nia's birthday is this {d(-4).strftime('%A')}, {on(-4)}! Nia doesn't want a big thing, but loves flowers (peonies, or anything from that Grand Lake stall). Should we do something small?", cc=["priya"])
th(62, "Big news", "leo", ["me"], f"Got the call this morning — I got promoted to senior photo editor! Starts {on(46)}. Giants game on me next time.", cc=["sam"])
th(113, "I DID IT", "sam", ["me"], f"26.2 miles. I finished the San Francisco Marathon on {on(113)}!! Legs are gone. Thanks for the 6am cheer squad texts.", cc=["priya", "kai"])
th(30, "New place!", "alex", ["me"], f"Finally moved! I moved to Oakland on {on(30)} — new apartment is ten minutes from Pacific Pipe, which is dangerous for my climbing habit. Come see it. Looking for people to boulder with on this side of the bay.")
th(24, "Oakland era", "riya", ["me"], f"Update: I moved to Oakland on {on(24)}, right by Lake Merritt. Still unpacking. First priority is finding a climbing gym crew over here — I miss having a regular bouldering partner.", cc=["nia"])
th(140, "Graduated!!", "lena", ["me"], f"The MFA show is done and I'm officially graduated as of {on(141)}. Thank you for coming to the opening!", cc=["nia", "leo"])

# --- memory-rich + logistics threads
th(47, "Re: that Ethiopian place", "maya", ["me"], "Okay that Ethiopian dinner was unreal — I basically love Ethiopian food more than anything now. Next time injera is on me. Also: Thursdays are my free night from here on out.")
th(49, "Tilden hike this weekend?", "theo", ["me"], "Lab is eating my Thursdays until 7, but weekends are good. Tilden Saturday? I'll bring the good espresso.", cc=["maya", "jordan"])
th(63, "Dinner club — who's cooking", "jordan", ["me"], "I'll cook this Thursday. Heads up I'm car-free now, so anything in the future near BART is perfect for me.", cc=["maya", "theo"])
th(76, "Re: Dinner club menu", "jordan", ["me"], "Doing a jollof + plantain situation. Maya's bringing dessert, Theo's on drinks.", cc=["maya", "theo"])
th(105, "Dinner club Thursday", "maya", ["me"], "Same time Thursday? I can do 7:30 after my run.", cc=["jordan", "theo"])
th(17, "CS 189 pset 6", "priya", ["me"], "Did you get question 4? Study session tomorrow at Moffitt, 4th floor as usual.", cc=["sam", "kai"])
th(31, "Midterm review plan", "kai", ["me"], "I booked the Moffitt room 4–7. Bringing the whiteboard markers.", cc=["priya", "sam"])
th(28, "Board game night — Saturday", "sam", ["me"], "My place, 7pm. Leo is bringing Wingspan, Nia is bringing snacks.", cc=["leo", "nia", "priya"])
th(56, "Catan rematch", "leo", ["me"], "I demand a rematch. Saturday?", cc=["sam", "nia", "priya"])
th(84, "Game night photos", "nia", ["me"], "Sharing the photos from game night — Sam's face when he lost is priceless.", cc=["sam", "leo", "priya"])
th(37, "RSF pickup tomorrow", "alex", ["me"], "6pm at RSF. We need a fifth.", cc=["sam", "kai"])
th(65, "Pickup this week?", "kai", ["me"], "Court's booked 6–8 Wednesday.", cc=["alex", "sam"])
th(4, "Boba after class?", "priya", ["me"], "Asha at 1? I need a matcha and to complain about the pset.")
th(7, "Ramen run", "sam", ["me"], "Late ramen tonight? Priya's in.", cc=["priya"])
th(13, "Giants tix", "leo", ["me"], "Got two for tonight — you in? I'll bring the film camera.")
th(21, "Farmers market Sunday", "nia", ["me"], "Grand Lake at 10? Riya wants the tamale stand.", cc=["riya"])
th(19, "Dosa night!", "riya", ["me"], "Vik's at 7 — Priya's coming too.", cc=["priya"])
th(42, "Sound Room Friday", "jordan", ["me"], "Quartet at the Sound Room on Friday, Nia's coming. You should too.", cc=["nia"])
th(51, "First Fridays", "lena", ["me"], "Art walk this Friday? Nia's in. There's a new natural wine spot after.", cc=["nia"])
th(58, "Dolores on Sunday", "lena", ["me"], "Sun's out. Dolores at 3 with Leo?", cc=["leo"])
th(39, "Demo day", "theo", ["me"], "Lab demo day is at 5 in Cory — Kai's robot arm might actually work this time.", cc=["kai"])
th(24, "Dune rewatch", "kai", ["me"], "Strada then Dune part two at my place?")
th(16, "Pacific Pipe tonight", "alex", ["me"], "New V4 set in the cave. 6pm?")
th(35, "Coffee tomorrow?", "maya", ["me"], "Strada at 10? I have Stripe interview prep stories.")
th(70, "Record store finds", "jordan", ["me"], "Found a first pressing of Kind of Blue. Come over and listen.")
th(742, "Seattle!", "ben", ["me"], "Made it to Seattle. The apartment has a view of the Sound. Come visit — I mean it.")
th(380, "Long time", "ben", ["me"], "Hey stranger. Was just thinking about that Mt. Tam hike. Hope Berkeley's treating you well.")
# --- non-friend noise
th(2, "Your weekly digest", "digest@newsletter.example.org", ["me"], "Top stories this week in ML research…")
th(9, "CS 189: Homework 6 released", "staff@eecs189.example.edu", ["me"], "Homework 6 is now available on the course site.")
th(26, "Lease renewal", "landlord@example.net", ["me"], "Please confirm whether you intend to renew by Dec 1.")
th(45, "Internship follow-up", "recruiting@example.org", ["me"], "Thanks for chatting with our team last week.")
th(72, "Hi sweetheart", "mom@example.com", ["me"], "Call when you get a chance! Dad says hi.")
th(90, "Receipt for your order", "orders@shop.example.com", ["me"], "Thanks for your purchase.")
th(120, "Research group meeting notes", "advisor@example.edu", ["me"], "Notes attached from Tuesday's meeting.")
threads.sort(key=lambda t: t["date"])
for i, t in enumerate(threads):
    t["id"] = f"thr_{i + 1:03d}"

# ---------------------------------------------------------------- friend calendars (this week)
WEEK = {name: (TODAY + timedelta(days=(i - TODAY.weekday()) % 7)).isoformat() for i, name in enumerate(WEEKDAYS)}  # next occurrence of each weekday


def busy(day, start, end, title):
    return {"date": WEEK[day], "start": start, "end": end, "title": title}


friend_calendars = {
    "maya": {
        "owner": "maya", "preferences": {
            "no_weekdays": ["tue"], "latest_end": {"tue": "20:30"}, "likes": ["ethiopian"], "budget": "$$",
            "notes": "Never Tuesdays (team dinner). Dawn run Wednesday, so no late Tuesday nights."},
        "busy": [busy("tue", "18:00", "21:30", "Stripe team dinner"), busy("wed", "05:30", "07:30", "Dawn run — Big Sur training"),
                 busy("wed", "18:30", "20:00", "Run club"), busy("fri", "19:00", "22:00", "Sister in town")],
    },
    "jordan": {
        "owner": "jordan", "preferences": {
            "near_bart": True, "max_walk_min": 8, "likes": ["jazz", "anything spicy"], "budget": "$$",
            "notes": "Car-free. Wants somewhere a short walk from BART."},
        "busy": [busy("wed", "18:00", "21:00", "Choir rehearsal"), busy("sat", "17:00", "23:00", "Gig at the Sound Room")],
    },
    "theo": {
        "owner": "theo", "preferences": {
            "earliest_start": {"thu": "19:30"}, "likes": ["espresso", "shared plates"], "budget": "$$",
            "notes": "In lab until 7 on Thursdays."},
        "busy": [busy("tue", "17:00", "19:30", "Robotics seminar"), busy("thu", "13:00", "19:00", "Lab block"),
                 busy("fri", "18:00", "20:30", "Chess club")],
    },
}
me_calendar = {
    "owner": "me", "preferences": {"budget": "$$", "notes": "Evenings preferred. Based near campus."},
    "busy": [busy("wed", "16:00", "19:00", "CS 189 study session"), busy("fri", "18:00", "22:00", "Nia's birthday")],
}

# ---------------------------------------------------------------- memory seed (things Orbit already "remembers")
memory_seed = [
    {"subject": "maya", "fact": "Training for the Big Sur marathon", "chip": "Big Sur marathon", "kind": "interest"},
    {"subject": "maya", "fact": "Loves Ethiopian food", "chip": "Loves Ethiopian food", "kind": "preference"},
    {"subject": "maya", "fact": "Thursdays are the free night", "chip": "Free Thursdays", "kind": "schedule"},
    {"subject": "jordan", "fact": "Car-free — prefers places near BART", "chip": "Near BART", "kind": "preference"},
    {"subject": "jordan", "fact": "Found a first pressing of Kind of Blue", "chip": "Kind of Blue vinyl", "kind": "interest"},
    {"subject": "theo", "fact": "In lab until 7 on Thursdays", "chip": "Lab till 7 Thu", "kind": "schedule"},
    {"subject": "theo", "fact": "Brings the good espresso on hikes", "chip": "Espresso nerd", "kind": "interest"},
    {"subject": "nia", "fact": "Loves peonies from the Grand Lake flower stall", "chip": "Loves peonies", "kind": "preference"},
    {"subject": "alex", "fact": "Boulders at Pacific Pipe; looking for climbing partners in Oakland", "chip": "Pacific Pipe regular", "kind": "interest"},
    {"subject": "riya", "fact": "Misses having a regular bouldering partner", "chip": "Wants a climbing crew", "kind": "interest"},
    {"subject": "leo", "fact": "Shoots film at Giants games", "chip": "Film camera", "kind": "interest"},
    {"subject": "sam", "fact": "Ran the SF Marathon", "chip": "Marathoner", "kind": "interest"},
    {"subject": "priya", "fact": "Matcha at Asha, always", "chip": "Matcha order", "kind": "preference"},
    {"subject": "kai", "fact": "Building a robot arm in Cory Hall", "chip": "Robot arm", "kind": "interest"},
    {"subject": "lena", "fact": "Into natural wine and art walks", "chip": "Natural wine", "kind": "interest"},
    {"subject": "ben", "fact": "Moved to Seattle; misses the Mt. Tam hikes", "chip": "Mt. Tam hikes", "kind": "interest"},
]

# ---------------------------------------------------------------- write
def localize(text: str) -> str:
    """Swap fictional cast members for the people in local_roster.json (ids, names, emails)."""
    for old_id, who in ROSTER.get("friends", {}).items():
        new_id = who.get("id") or who["name"].lower().split()[0]
        text = re.sub(rf"\b{old_id}@example\.com\b", who.get("email", f"{new_id}@example.com"), text)
        text = re.sub(rf"\b{old_id}\b", new_id, text)
        text = re.sub(rf"\b{old_id.capitalize()}\b", who["name"], text)
    return text


def write(name: str, obj):
    path = DATA / localize(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(localize(json.dumps(obj, indent=2, ensure_ascii=False)))


if (DATA / "friend_calendars").exists():
    for stale in (DATA / "friend_calendars").glob("*.json"):
        stale.unlink()
write("mock_contacts.json", {"me": {"name": ME_NAME, "email": ME, "city": "Berkeley"}, "today": TODAY.isoformat(), "contacts": contacts})
write("mock_calendar.json", events)
write("mock_emails.json", threads)
write("memory_seed.json", memory_seed)
write("friend_calendars/me.json", me_calendar)
for k, v in friend_calendars.items():
    write(f"friend_calendars/{k}.json", v)
print(f"{len(contacts)} contacts, {len(events)} events, {len(threads)} threads for {TODAY} ({len(ROSTER.get('friends', {}))} cast members localized)")
