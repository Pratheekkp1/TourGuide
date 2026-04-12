"""
Curated, verified city data for the most-visited tourist destinations.
Used as instant local cache — no AI call needed for matched cities.
Gemini is only called for unrecognized locations.
"""

# Each city entry keyed by lowercase city name variants.
# Coordinates used for bounding-box matching (lat_min, lat_max, lng_min, lng_max).

CITY_BOUNDS = {
    "washington_dc": (38.79, 38.99, -77.12, -76.91),
    "new_york":      (40.47, 40.92, -74.26, -73.70),
    "london":        (51.28, 51.70, -0.51, 0.33),
    "paris":         (48.81, 48.91, 2.22, 2.47),
    "tokyo":         (35.52, 35.82, 139.59, 139.93),
    "bangkok":       (13.57, 13.96, 100.33, 100.93),
    "rome":          (41.79, 41.99, 12.34, 12.61),
    "barcelona":     (41.30, 41.47, 2.05, 2.23),
    "amsterdam":     (52.28, 52.44, 4.73, 5.08),
    "singapore":     (1.20,  1.49, 103.60, 104.05),
    "college_park":  (38.97, 38.99, -76.95, -76.91),
}

CITY_DATA = {

"washington_dc": {
    "display_name": "Washington D.C.",
    "scams": {
        "warning_level": "moderate",
        "city": "Washington D.C.",
        "scams": [
            {
                "name": "Friendship Bracelet Hustle",
                "where": "National Mall, Lincoln Memorial steps, near museums",
                "how_it_works": "A vendor approaches and ties a 'friendship bracelet' onto your wrist before you can refuse, then demands payment — usually $10–20. They become aggressive if you refuse.",
                "red_flags": ["Anyone who approaches you with a bracelet already in hand", "Fast-talking with physical contact before you consent"],
                "how_to_avoid": "Keep walking and say 'no thank you' firmly — do not let them touch your wrist."
            },
            {
                "name": "Fake Charity Clipboard",
                "where": "Metro Center, Gallery Place, tourist shopping areas",
                "how_it_works": "Someone with a clipboard claims to collect for a deaf school or children's charity. After you sign, they aggressively demand a cash donation and won't give your pen back.",
                "red_flags": ["Pre-printed cards with fake charity names", "Working in groups of 2–3 people"],
                "how_to_avoid": "Never sign anything from a street solicitor — legitimate charities don't solicit this way."
            },
            {
                "name": "Metro Fare 'Helper'",
                "where": "Any Metrorail station entrance",
                "how_it_works": "Someone offers to help you buy a SmarTrip card or load fare, takes your cash, and either disappears or gives you a card with much less value than you paid for.",
                "red_flags": ["Unsolicited offers of help at fare machines", "Claiming the machine 'only takes cash' (it takes cards)"],
                "how_to_avoid": "Use the fare machines yourself — they have multilingual interfaces. Station managers are in the glass booth and always free to help."
            },
            {
                "name": "Taxi Meter Skip",
                "where": "Dulles Airport, Reagan Airport pickups",
                "how_it_works": "Unlicensed 'taxi' drivers quote a flat rate higher than the metered fare would be, or claim the meter is broken.",
                "red_flags": ["Drivers approach you inside the terminal (illegal)", "No visible taxi license on the dashboard"],
                "how_to_avoid": "Use the official taxi queue at both airports, or use Uber/Lyft — it's cheaper and metered."
            },
            {
                "name": "Photo Op Demand",
                "where": "White House fence, Capitol steps",
                "how_it_works": "Someone dressed as a historical figure or mascot poses for photos with you or your family, then demands $10–20 per photo.",
                "red_flags": ["Costume characters who position themselves near you without being asked"],
                "how_to_avoid": "Establish the price before posing, or simply decline."
            }
        ],
        "golden_rule": "D.C. is generally safe in tourist areas — most street 'scams' are persistent salespeople, not violent crime. Firm, polite refusal works in nearly every case."
    },
    "prices": {
        "city": "Washington D.C.",
        "currency": "US Dollar ($)",
        "exchange_tip": "ATMs are widely available; avoid currency exchange booths at airports which charge 8–12% markup. Any US bank ATM gives the best rate.",
        "items": [
            {"item": "Coffee (drip)", "emoji": "☕", "local_price": "$2.50–3.50", "tourist_price": "$4–6", "markup": "medium", "tip": "7-Eleven and CVS have $1 coffee; avoid Starbucks in museum gift shops"},
            {"item": "Street food / food truck", "emoji": "🌮", "local_price": "$8–12", "tourist_price": "$12–18", "markup": "medium", "tip": "The food truck clusters on L St NW and near the Mall have the best value"},
            {"item": "Sit-down restaurant", "emoji": "🍽️", "local_price": "$15–25", "tourist_price": "$30–50", "markup": "high", "tip": "Lunch menus are 30–40% cheaper than the same dinner item — eat your big meal at noon"},
            {"item": "Beer (local craft)", "emoji": "🍺", "local_price": "$5–7", "tourist_price": "$9–14", "markup": "high", "tip": "DC Brau and Atlas Brew Works are local — find them at Whole Foods for $2.50/can"},
            {"item": "Water bottle", "emoji": "💧", "local_price": "$1–2", "tourist_price": "$4–5", "markup": "high", "tip": "All public buildings and most Metro stations have free water fountains"},
            {"item": "Metro fare", "emoji": "🚇", "local_price": "$2–6 (distance based)", "tourist_price": "$6–10 (paper ticket)", "markup": "medium", "tip": "SmarTrip card saves 25¢ per trip vs paper tickets — get one for $10 at any station"},
            {"item": "Taxi per mile", "emoji": "🚕", "local_price": "$2.16/mile", "tourist_price": "$3.50+/mile", "markup": "medium", "tip": "Lyft/Uber are consistently cheaper than street hail; surge pricing only evenings"},
            {"item": "Museum entry", "emoji": "🏛️", "local_price": "$0 (Smithsonian)", "tourist_price": "$0 (all Smithsonian free)", "markup": "low", "tip": "All 19 Smithsonian museums are permanently free — skip any 'tour' that charges entry"},
            {"item": "Souvenir t-shirt", "emoji": "👕", "local_price": "$10–15", "tourist_price": "$25–40", "markup": "high", "tip": "Gift shops 2 blocks from the Mall charge half the price of vendors on the Mall itself"}
        ],
        "bargaining": "Bargaining is not standard in D.C. — fixed pricing everywhere except flea markets (Eastern Market on weekends) and some street vendors."
    },
    "transit": {
        "city": "Washington D.C.",
        "systems": [
            {"name": "Metro (Metrorail)", "emoji": "🚇", "coverage": "All major tourist areas, airports, suburbs", "frequency": "Every 4–12 min peak, 15–20 min off-peak", "hours": "Mon–Fri 5am–12am, Sat 7am–1am, Sun 8am–11pm"},
            {"name": "Metrobus", "emoji": "🚌", "coverage": "Citywide including areas Metro misses", "frequency": "Every 10–30 min depending on route", "hours": "24/7 on major routes"},
            {"name": "Capital Bikeshare", "emoji": "🚲", "coverage": "3,000+ bikes at 600+ stations throughout DC and Arlington", "frequency": "Always available via app", "hours": "24/7"}
        ],
        "card": {
            "name": "SmarTrip Card",
            "cost": "$10 ($2 card fee + $8 loaded)",
            "where_to_buy": "Any Metrorail station fare machine, CVS/Walgreens, online at wmata.com",
            "how_to_use": "Tap the yellow reader when you enter AND exit the fare gate — failing to tap out charges you the maximum fare (~$6). Add money at any fare machine.",
            "tourist_pass": "7-Day Unlimited Pass: $21.60 — great value if you ride more than 4 times. Sold at station machines."
        },
        "fares": {
            "single_ride": "$2.00–$6.00 (distance-based, peak vs off-peak)",
            "day_pass": "$13 day pass available on SmarTrip",
            "airport_to_center": "Reagan (DCA): $2.25–3.85 on Metro (30 min). Dulles: $11.75 on Silver Line (60 min)."
        },
        "apps": [
            {"name": "DC Metro & Bus (unofficial)", "what_for": "Real-time arrivals, trip planning", "platform": "Both"},
            {"name": "Capital Bikeshare", "what_for": "Unlock bikes, find stations", "platform": "Both"},
            {"name": "Google Maps", "what_for": "Full transit routing with real-time data", "platform": "Both"}
        ],
        "avoid": [
            "Don't buy paper farecards — they cost 25¢ more per trip and can't be reloaded",
            "Tapping out is mandatory — failing to exit-tap charges maximum fare",
            "Metrorail closes at midnight Friday/Saturday — plan late nights with Uber or Metrobus",
            "The 'DC Circulator' bus is cheaper ($1 flat) and covers the Mall/Georgetown/U Street"
        ],
        "pro_tip": "The DC Circulator bus costs only $1 (exact cash or SmarTrip) and runs direct routes between all tourist areas — it's faster than Metro for going between the Mall and Georgetown."
    }
},

"new_york": {
    "display_name": "New York City",
    "scams": {
        "warning_level": "high",
        "city": "New York City",
        "scams": [
            {
                "name": "Three-Card Monte",
                "where": "Midtown sidewalks, Times Square, Canal Street",
                "how_it_works": "Street gambling game — find the queen/red card. The dealer is skilled at sleight of hand and you will never win. Shills in the crowd fake winning to encourage you. The 'lookout' watches for police.",
                "red_flags": ["Crowd gathered around a cardboard box on the street", "People cheering wins enthusiastically"],
                "how_to_avoid": "Walk past without stopping — illegal gambling that always favors the house."
            },
            {
                "name": "CD / Rap Demo Hustle",
                "where": "Times Square, Midtown pedestrian areas",
                "how_it_works": "Someone hands you a CD claiming it's free, then demands $20+ as a 'donation' when you try to walk away. Becomes aggressive.",
                "red_flags": ["'Free CD' offered unsolicited", "Works in pairs — one distracts, one demands payment"],
                "how_to_avoid": "Don't take it. Say 'no thanks' and keep walking without making eye contact."
            },
            {
                "name": "Times Square Character Shakedown",
                "where": "Times Square pedestrian plaza",
                "how_it_works": "Costumed characters (Elmo, Spider-Man, Minions) aggressively pose for photos then demand $20–40. Some grab children for photos without consent.",
                "red_flags": ["Character approaches you (vs you approaching them)", "Multiple characters surrounding your group"],
                "how_to_avoid": "Establish price first, have small bills ready, or avoid entirely — the characters near 47th St are the most aggressive."
            },
            {
                "name": "Taxi Long Haul",
                "where": "JFK, LaGuardia airports",
                "how_it_works": "Driver takes a longer route to inflate the metered fare. JFK to Midtown should be $52–80 flat; any higher is suspicious.",
                "red_flags": ["Driver doesn't confirm your destination before starting", "Meter starts before you're on the highway"],
                "how_to_avoid": "JFK has a flat $52 rate to Midtown (plus tolls/tip). Request it explicitly before getting in."
            },
            {
                "name": "Subway 'Swipe' Offer",
                "where": "Busy subway stations",
                "how_it_works": "Someone offers to swipe you through the turnstile with their MetroCard for $2 cash — their card may be fraudulently loaded or it's a social engineering setup.",
                "red_flags": ["Offer seems too convenient when you're struggling with the machine"],
                "how_to_avoid": "Use the machine with your credit card — it's faster and cheaper than dealing with this."
            }
        ],
        "golden_rule": "In NYC: if someone approaches you on the street to offer something, sell something, or ask for something — your default answer is 'no' and keep walking. Legitimate New Yorkers don't approach strangers."
    },
    "prices": {
        "city": "New York City",
        "currency": "US Dollar ($)",
        "exchange_tip": "Use ATMs at Chase, Citi, or Wells Fargo bank branches for best rates. Avoid standalone ATMs in bodegas which charge $3–5 fees.",
        "items": [
            {"item": "Coffee (drip)", "emoji": "☕", "local_price": "$1.50–2.50", "tourist_price": "$5–7", "markup": "high", "tip": "Any bodega (corner deli) has $1.50 deli coffee — same quality, no Instagram"},
            {"item": "Pizza slice", "emoji": "🍕", "local_price": "$3–5", "tourist_price": "$5–8", "markup": "medium", "tip": "The 'dollar slice' is real — Joe's Pizza, 2 Bros, Koronet all have $3 slices"},
            {"item": "Sit-down restaurant", "emoji": "🍽️", "local_price": "$20–35", "tourist_price": "$40–80", "markup": "high", "tip": "Restaurant Week (Jan & July) has $30 prix-fixe menus at top restaurants"},
            {"item": "Beer", "emoji": "🍺", "local_price": "$6–8 (bar)", "tourist_price": "$14–18", "markup": "high", "tip": "Bodega 40oz for $3 if you're budget-focused; Times Square bars are tourist traps"},
            {"item": "Water bottle", "emoji": "💧", "local_price": "$1–2 (bodega)", "tourist_price": "$4–6", "markup": "high", "tip": "NYC tap water is world-class — bring a reusable bottle; fountains in all parks"},
            {"item": "Subway fare", "emoji": "🚇", "local_price": "$2.90 (OMNY/MetroCard)", "tourist_price": "$3.50 (single ticket)", "markup": "medium", "tip": "Tap any contactless credit card directly — no MetroCard needed, same $2.90 fare"},
            {"item": "Taxi per mile", "emoji": "🚕", "local_price": "$3.50 base + $2.50/mile", "tourist_price": "$5–8/mile (surge)", "markup": "medium", "tip": "Subway is always faster than taxi during the day — Manhattan traffic is brutal"},
            {"item": "Museum entry", "emoji": "🎨", "local_price": "$0–20 (suggested)", "tourist_price": "$30–40 (listed price)", "markup": "high", "tip": "MoMA, The Met, Guggenheim all have 'suggested' donations — you can pay $1 and it's legal"},
            {"item": "Souvenir", "emoji": "🗽", "local_price": "$5–10", "tourist_price": "$20–35", "markup": "high", "tip": "Canal Street vendors in Chinatown have the cheapest souvenirs; avoid Times Square shops"}
        ],
        "bargaining": "No bargaining at restaurants or shops. At Chinatown markets and some street vendors, offering 60–70% of the asking price is acceptable."
    },
    "transit": {
        "city": "New York City",
        "systems": [
            {"name": "Subway (MTA)", "emoji": "🚇", "coverage": "All 5 boroughs, 472 stations", "frequency": "Every 3–8 min peak, 10–20 min off-peak", "hours": "24/7 — never closes"},
            {"name": "MTA Bus", "emoji": "🚌", "coverage": "Everywhere the subway doesn't reach", "frequency": "Every 8–20 min", "hours": "24/7 on most routes"},
            {"name": "LIRR / NJ Transit", "emoji": "🚆", "coverage": "Long Island, New Jersey, suburbs", "frequency": "Hourly off-peak", "hours": "5am–1am"}
        ],
        "card": {
            "name": "OMNY (tap-to-pay) or MetroCard",
            "cost": "MetroCard: $1 card fee + fare. OMNY: just tap any credit/debit card.",
            "where_to_buy": "MetroCard at any subway station machine. OMNY: tap your existing card or phone — nothing to buy.",
            "how_to_use": "Tap your contactless card or phone at the turnstile reader. No exit tap needed. Each tap is $2.90. After 12 rides in a week, rides are free (OMNY weekly cap).",
            "tourist_pass": "7-Day Unlimited MetroCard: $34 — worth it if you take more than 12 subway trips in 7 days."
        },
        "fares": {
            "single_ride": "$2.90 (subway/local bus)",
            "day_pass": "$34/week unlimited (MetroCard); OMNY caps at $34/week automatically",
            "airport_to_center": "JFK: $2.90 subway (A train, 60–75 min) or $52 flat taxi. LaGuardia: $2.90 bus+subway (60 min) or $35–60 Uber."
        },
        "apps": [
            {"name": "Citymapper", "what_for": "Best transit routing in NYC — more accurate than Google", "platform": "Both"},
            {"name": "MYmta", "what_for": "Real-time bus tracking, service alerts", "platform": "Both"},
            {"name": "Google Maps", "what_for": "General routing", "platform": "Both"}
        ],
        "avoid": [
            "Never buy a MetroCard from a person (only machines or station agents) — it may be depleted",
            "Express trains (letters) skip local stops — check if your station is express or local",
            "The subway is 24/7 but late-night frequency drops to every 20–30 min after midnight",
            "Don't stand on the yellow platform edge — trains overhang it slightly"
        ],
        "pro_tip": "Tap any contactless Visa/Mastercard or Apple Pay/Google Pay directly at the OMNY reader — no MetroCard needed, same $2.90 fare, and your bank's exchange rate beats any currency kiosk."
    }
},

"london": {
    "display_name": "London, UK",
    "scams": {
        "warning_level": "moderate",
        "city": "London",
        "scams": [
            {
                "name": "Oyster Card 'Helper'",
                "where": "Heathrow Express, major Underground stations",
                "how_it_works": "Someone offers to help you buy an Oyster card, overcharges you or pockets some of the money you hand them for loading.",
                "red_flags": ["Anyone who approaches you near a ticket machine offering help"],
                "how_to_avoid": "Tap any contactless card directly — no Oyster needed. TfL staff in orange vests are always legitimate."
            },
            {
                "name": "Taxi Tout",
                "where": "Outside clubs, pubs (11pm–3am), airports",
                "how_it_works": "Unlicensed minicab drivers offer cheap rides. No meter, no insurance, and fares end up being 3x a licensed cab.",
                "red_flags": ["Driver approaches you rather than you booking", "No TfL license plate (yellow badge on bonnet)"],
                "how_to_avoid": "Book via the Uber/Bolt app or use a black cab — black cabs can always be hailed safely."
            },
            {
                "name": "Charity Muggers (Chuggers)",
                "where": "Oxford Street, Covent Garden, tourist areas",
                "how_it_works": "High-energy charity workers try to get you to sign up for a monthly direct debit donation. Fully legal but very persistent — they work on commission.",
                "red_flags": ["Branded tabards, clipboard, asking for your bank details on the street"],
                "how_to_avoid": "Say 'I give directly' and keep walking — this is universally understood."
            },
            {
                "name": "Overpriced West End Ticket Touts",
                "where": "Outside theatre district, Leicester Square",
                "how_it_works": "Sellers offer 'last minute' theatre tickets at 3–5x face value, often for bad seats or invalid tickets.",
                "red_flags": ["Tickets sold outside the venue or unofficial booths", "Pressure selling with 'only 2 left'"],
                "how_to_avoid": "TKTS booth at Leicester Square (official) sells same-day tickets at 25–50% off. Or buy directly from the venue box office."
            }
        ],
        "golden_rule": "London is very safe for tourists — most 'scams' are opportunistic overcharging rather than aggressive crime. Always use official ticketing and licensed transport."
    },
    "prices": {
        "city": "London",
        "currency": "British Pound (£)",
        "exchange_tip": "Withdraw GBP from a Barclays or HSBC ATM using your home card — much better rate than Bureaux de Change. Monzo/Revolut cards have zero forex fees.",
        "items": [
            {"item": "Coffee (flat white)", "emoji": "☕", "local_price": "£3–4", "tourist_price": "£5.50–7", "markup": "medium", "tip": "Pret A Manger has £1.35 filtered coffee with their subscription; Costa is cheaper than Starbucks"},
            {"item": "Meal deal (sandwich+drink+snack)", "emoji": "🥪", "local_price": "£3.50–5", "tourist_price": "N/A", "markup": "low", "tip": "Every Boots, Sainsbury's, and Co-op does a meal deal — the best value lunch in London"},
            {"item": "Sit-down restaurant", "emoji": "🍽️", "local_price": "£15–25", "tourist_price": "£30–55", "markup": "high", "tip": "Lunch set menus in Soho/Covent Garden are 40% cheaper than dinner for identical food"},
            {"item": "Pint of beer", "emoji": "🍺", "local_price": "£5–6", "tourist_price": "£7–10", "markup": "medium", "tip": "Wetherspoons pubs serve £2.50–3 pints — unfashionable but universal and clean"},
            {"item": "Water bottle", "emoji": "💧", "local_price": "£1–1.50", "tourist_price": "£3–4", "markup": "high", "tip": "Refill My Bottle app shows 1,000+ free refill stations; Tap London tap water is drinkable"},
            {"item": "Tube fare", "emoji": "🚇", "local_price": "£2.80 (contactless, Zone 1)", "tourist_price": "£4.90 (paper ticket)", "markup": "high", "tip": "Never buy a paper Tube ticket — contactless is capped at £8.10/day in Zone 1"},
            {"item": "Bus fare", "emoji": "🚌", "local_price": "£1.75 flat (contactless)", "tourist_price": "No cash accepted", "markup": "low", "tip": "London buses don't take cash — only contactless card or Oyster"},
            {"item": "Museum entry", "emoji": "🏛️", "local_price": "£0 (most)", "tourist_price": "£0 (British Museum, V&A, Natural History, National Gallery all free)", "markup": "low", "tip": "Most of London's world-class museums are permanently free — skip any paid entry on the museum's own site"},
            {"item": "Souvenir", "emoji": "💂", "local_price": "£5–10", "tourist_price": "£15–30", "markup": "high", "tip": "Oxford Street Primark has the cheapest tourist-friendly goods; avoid shops directly outside Buckingham Palace"}
        ],
        "bargaining": "Bargaining is not typical in London. Exception: Portobello Road Market and Camden Market on weekends — friendly negotiation is welcomed."
    },
    "transit": {
        "city": "London",
        "systems": [
            {"name": "London Underground (Tube)", "emoji": "🚇", "coverage": "Central London and suburbs, 11 lines, 272 stations", "frequency": "Every 2–5 min peak, 8–10 min off-peak", "hours": "Mon–Sat 5am–1am; 24hr Fri–Sat on some lines"},
            {"name": "London Bus", "emoji": "🚌", "coverage": "Entire city, 700+ routes", "frequency": "Every 5–15 min on main routes", "hours": "24/7 (Night Bus routes after midnight)"},
            {"name": "Elizabeth Line (Crossrail)", "emoji": "🟣", "coverage": "Heathrow to Reading/Shenfield through central London", "frequency": "Every 5 min peak", "hours": "Mon–Sat 6am–1am, Sun 8am–11pm"},
            {"name": "Santander Cycles (Boris Bikes)", "emoji": "🚲", "coverage": "Central London, 800+ docking stations", "frequency": "24/7", "hours": "24/7"}
        ],
        "card": {
            "name": "Contactless card or Oyster",
            "cost": "Oyster: £7 deposit (refundable). Contactless: just use your existing card.",
            "where_to_buy": "Oyster at any Tube station. Contactless: just tap your card — works everywhere Oyster does.",
            "how_to_use": "Tap IN at the yellow reader when entering, tap OUT when leaving. Fares are distance-based. Daily and weekly caps apply automatically — you'll never overpay.",
            "tourist_pass": "Travelcard: 1-Day Zone 1–2 is £15.20. Only worth it if you're making many trips — otherwise contactless daily cap (£8.10 Zone 1–2) is automatic and cheaper."
        },
        "fares": {
            "single_ride": "£2.80 (Zone 1, contactless). Paper ticket: £4.90 — avoid.",
            "day_pass": "£8.10/day automatic cap (Zones 1–2) with contactless — no need to buy a day pass",
            "airport_to_center": "Heathrow: £12.80 Tube (Piccadilly line, 50 min) or £22 Heathrow Express (15 min). Gatwick: £19.90 Gatwick Express (30 min)."
        },
        "apps": [
            {"name": "Citymapper London", "what_for": "Best routing, live disruption alerts, walking alternatives", "platform": "Both"},
            {"name": "TfL Go", "what_for": "Official TfL app — real-time arrivals, accessibility info", "platform": "Both"},
            {"name": "Santander Cycles", "what_for": "Unlock Boris Bikes, find docking stations", "platform": "Both"}
        ],
        "avoid": [
            "Never buy a paper single ticket — it costs nearly double the contactless fare",
            "Always tap OUT at your destination or you'll be charged the maximum fare",
            "The Tube is not 24hr on most lines — last trains leave central London around 12:30am on weekdays",
            "Don't stand on the left on escalators — walking on the left, standing on the right is a strict unwritten rule"
        ],
        "pro_tip": "Your contactless Visa or Mastercard (or Apple Pay / Google Pay) works exactly like an Oyster card — just tap in and out. The daily fare cap of £8.10 applies automatically, so you'll never pay more than a day pass."
    }
},

"college_park": {
    "display_name": "College Park, MD (University of Maryland)",
    "scams": {
        "warning_level": "low",
        "city": "College Park / UMD",
        "scams": [
            {
                "name": "Off-Campus Sublease Scam",
                "where": "Facebook Marketplace, Craigslist listings for UMD-area apartments",
                "how_it_works": "Fake landlord posts photos of a real apartment (often copied from Zillow), asks for first/last month's rent as a deposit before a showing, then disappears.",
                "red_flags": ["Price significantly below market for the area", "Landlord claims to be traveling and can't show the unit in person", "Request for wire transfer or Zelle only"],
                "how_to_avoid": "Never send money before physically seeing a unit. UMD Off-Campus Housing (och.umd.edu) lists verified rentals."
            },
            {
                "name": "Fake Rideshare Pickup",
                "where": "Outside Terrapin bar strip (Baltimore Ave), weekend nights",
                "how_it_works": "An unmarked car pulls up claiming to be your Uber/Lyft. Driver may demand cash or charge an inflated rate.",
                "red_flags": ["License plate doesn't match your app", "Driver doesn't confirm your name first"],
                "how_to_avoid": "Always confirm the license plate, car model, AND driver photo in your app before getting in."
            },
            {
                "name": "Textbook Resale Overprice",
                "where": "Campus bookstore, local Facebook groups",
                "how_it_works": "Bookstore sells new textbooks at full MSRP which can be 5–10x what you'd pay elsewhere.",
                "red_flags": ["Any textbook over $150 at the campus store"],
                "how_to_avoid": "Check Chegg, VitalSource, or the UMD Library reserves first. Many textbooks are free PDFs — search '[title] filetype:pdf'."
            }
        ],
        "golden_rule": "College Park is a safe college town — stay aware at night near the bar strip on weekends, and always verify rideshare vehicle details before getting in."
    },
    "prices": {
        "city": "College Park, MD",
        "currency": "US Dollar ($)",
        "exchange_tip": "Bank of America ATMs on campus are fee-free for most US cards. Currency exchange isn't applicable for domestic visitors.",
        "items": [
            {"item": "Coffee", "emoji": "☕", "local_price": "$2–3.50", "tourist_price": "$4–6 (Stamp Union)", "markup": "medium", "tip": "Kaldi's Coffee in Stamp Student Union has the best value; 7-Eleven on Route 1 has $1 coffee"},
            {"item": "Campus dining meal", "emoji": "🍽️", "local_price": "$8–12 (with meal plan)", "tourist_price": "$12–18 (cash)", "markup": "medium", "tip": "All-you-can-eat dining halls accept Terrapin Express or cash — South Campus Dining Hall is best rated"},
            {"item": "Route 1 restaurant meal", "emoji": "🌮", "local_price": "$10–15", "tourist_price": "$10–15", "markup": "low", "tip": "Playa Bowls, Chipotle, and Kung Fu Tea on Route 1 are student-priced and always packed"},
            {"item": "Beer (bar)", "emoji": "🍺", "local_price": "$4–6", "tourist_price": "$6–8", "markup": "low", "tip": "Terrapin Bar and Looney's Pub on Baltimore Ave have happy hour specials 5–7pm weekdays"},
            {"item": "Water", "emoji": "💧", "local_price": "$0", "tourist_price": "$2–3", "markup": "high", "tip": "Water bottle fill stations in every academic building — bring a reusable bottle"},
            {"item": "Bus (Shuttle-UM)", "emoji": "🚌", "local_price": "$0 (free for UMD affiliates)", "tourist_price": "$0 (free for all)", "markup": "low", "tip": "UMD Shuttle-UM buses are free for everyone — use the TransLoc Rider app to track them live"},
            {"item": "Metro (Green Line)", "emoji": "🚇", "local_price": "$2.25", "tourist_price": "$2.25", "markup": "low", "tip": "College Park-U of Md Metro station (Green Line) is a 5-min shuttle ride to DC — great deal"},
            {"item": "Parking", "emoji": "🅿️", "local_price": "$2–5/day (Lot 1 on weekends)", "tourist_price": "$15–25 (Visitor lots)", "markup": "high", "tip": "Lot 1 adjacent to Stadium Drive is free on weekends; meter parking on Knox Rd is $1.50/hr"},
            {"item": "Souvenir / UMD gear", "emoji": "🐢", "local_price": "$15–25 (University Book Center)", "tourist_price": "$30–50 (online resellers)", "markup": "high", "tip": "University Book Center in Stamp Union has the widest and cheapest official UMD merch"}
        ],
        "bargaining": "No bargaining at campus or Route 1 establishments. Student discounts widely available — always ask."
    },
    "transit": {
        "city": "College Park, MD",
        "systems": [
            {"name": "Shuttle-UM (UMD Campus Bus)", "emoji": "🚌", "coverage": "All campus areas, Research Park, Metro station, off-campus apartments", "frequency": "Every 10–15 min during class hours", "hours": "7am–11pm Mon–Fri, reduced Sat/Sun"},
            {"name": "Washington Metro (Green Line)", "emoji": "🚇", "coverage": "College Park station → direct to downtown DC (25–40 min)", "frequency": "Every 6–12 min peak, 12–20 min off-peak", "hours": "Mon–Fri 5am–12am, Sat 7am–1am, Sun 8am–11pm"},
            {"name": "TheBus (Prince George's County)", "emoji": "🚌", "coverage": "Surrounding neighborhoods, Hyattsville, Langley Park", "frequency": "Every 20–30 min", "hours": "6am–10pm most routes"}
        ],
        "card": {
            "name": "SmarTrip Card (for Metro) + Free Shuttle",
            "cost": "$10 ($2 card + $8 loaded) for Metro. Shuttle-UM is completely free.",
            "where_to_buy": "SmarTrip at College Park Metro station machine or CVS on Route 1.",
            "how_to_use": "Tap SmarTrip to enter and exit Metro fare gates. Shuttle-UM: just board any bus — it's free for everyone, no card needed.",
            "tourist_pass": "SmarTrip 7-Day Unlimited: $21.60 — worth it for multiple DC trips. Metro to DC costs ~$3.25 each way from College Park."
        },
        "fares": {
            "single_ride": "$3.25 peak / $2.25 off-peak (College Park Metro → DC Metro Center)",
            "day_pass": "$13 SmarTrip day pass for unlimited Metro",
            "airport_to_center": "BWI: MARC train from BWI to Union Station $9 (40 min) then Metro. DCA: Metro directly (45 min from College Park, $3.85)."
        },
        "apps": [
            {"name": "TransLoc Rider", "what_for": "Real-time UMD Shuttle-UM tracking and ETAs", "platform": "Both"},
            {"name": "DC Metro & Bus", "what_for": "Metro arrival times and trip planning", "platform": "Both"},
            {"name": "Google Maps", "what_for": "Full routing combining Shuttle + Metro + walking", "platform": "Both"}
        ],
        "avoid": [
            "Shuttle-UM can get very crowded between classes (9am, 12pm, 5pm) — plan 10 min buffer",
            "The Metro station is a 5-min walk or shuttle ride from main campus — factor this into travel time",
            "Avoid driving to campus during class days — parking enforcement is active and tickets are $50+",
            "TheBus only accepts exact cash change or SmarTrip — no bills accepted"
        ],
        "pro_tip": "The UMD Shuttle-UM #104 'Metro Express' runs directly between the Metro station and McKeldin Library every 15 minutes — fastest way to get from campus to DC without parking."
    }
},

}


def find_city(lat: float, lng: float) -> str | None:
    """Return city key if coords fall within a known bounding box, else None."""
    if lat is None or lng is None:
        return None
    for city_key, (lat_min, lat_max, lng_min, lng_max) in CITY_BOUNDS.items():
        if lat_min <= lat <= lat_max and lng_min <= lng <= lng_max:
            return city_key
    return None
