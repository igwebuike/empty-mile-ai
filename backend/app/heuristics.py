import random
from . import models

BROKERS = [
    "Lone Star Foods", "Gulf Coast Freight", "BlueLine Logistics", "DFW Medical Supply",
    "Austin Retail Supply", "TexStar Brokerage", "Prime Distribution", "Metro Freight Partners",
    "Southern Produce Network", "Eagle Industrial Supply", "Riverbend Logistics", "Capital City Freight"
]

LANES = {
    "Houston": [("Dallas", "TX", 239), ("Fort Worth", "TX", 265), ("Austin", "TX", 165), ("San Antonio", "TX", 197), ("Oklahoma City", "OK", 445), ("New Orleans", "LA", 348)],
    "Dallas": [("Houston", "TX", 239), ("Austin", "TX", 195), ("San Antonio", "TX", 275), ("Oklahoma City", "OK", 207), ("Memphis", "TN", 452), ("Atlanta", "GA", 781)],
    "Atlanta": [("Charlotte", "NC", 244), ("Nashville", "TN", 250), ("Jacksonville", "FL", 346), ("Dallas", "TX", 781), ("Chicago", "IL", 716)],
    "Chicago": [("Indianapolis", "IN", 184), ("Detroit", "MI", 282), ("St Louis", "MO", 297), ("Atlanta", "GA", 716), ("Dallas", "TX", 967)],
    "Los Angeles": [("Phoenix", "AZ", 373), ("Las Vegas", "NV", 270), ("San Francisco", "CA", 383), ("Dallas", "TX", 1435)],
}

STATE_BY_CITY = {
    "Houston": "TX", "Dallas": "TX", "Fort Worth": "TX", "Austin": "TX", "San Antonio": "TX",
    "Oklahoma City": "OK", "New Orleans": "LA", "Memphis": "TN", "Atlanta": "GA", "Charlotte": "NC",
    "Nashville": "TN", "Jacksonville": "FL", "Chicago": "IL", "Indianapolis": "IN", "Detroit": "MI",
    "St Louis": "MO", "Los Angeles": "CA", "Phoenix": "AZ", "Las Vegas": "NV", "San Francisco": "CA"
}

EQUIPMENT_RATE = {"Dry Van": (2.05, 3.10), "Reefer": (2.35, 3.65), "Flatbed": (2.45, 3.80), "Power Only": (1.75, 2.55), "Box Truck": (1.70, 2.65)}

def generate_demo_loads(origin_city: str = "Houston", origin_state: str = "TX", destination_city: str | None = "Dallas", equipment: str = "Dry Van", count: int = 18):
    origin_city = (origin_city or "Houston").strip().title()
    origin_state = (origin_state or STATE_BY_CITY.get(origin_city, "TX")).strip().upper()
    destination_city = (destination_city or "Dallas").strip().title()
    equipment = equipment or "Dry Van"
    lanes = LANES.get(origin_city, [])
    if destination_city and not any(x[0].lower() == destination_city.lower() for x in lanes):
        # Put the requested destination first even when it is not in our lane map.
        lanes = [(destination_city, STATE_BY_CITY.get(destination_city, "TX"), 240)] + lanes
    elif destination_city:
        lanes = sorted(lanes, key=lambda x: 0 if x[0].lower() == destination_city.lower() else 1)
    if not lanes:
        lanes = [(destination_city or "Dallas", STATE_BY_CITY.get(destination_city or "Dallas", "TX"), 240)]

    low, high = EQUIPMENT_RATE.get(equipment, EQUIPMENT_RATE["Dry Van"])
    loads = []
    for i in range(count):
        dest, dest_state, miles = lanes[i % len(lanes)]
        # More attractive rates for desired destination and nearby destination.
        bias = 1.12 if destination_city and dest.lower() == destination_city.lower() else random.uniform(.94, 1.08)
        rpm = round(random.uniform(low, high) * bias, 2)
        rate = int(round(rpm * miles / 25) * 25)
        weight = random.choice([4500, 6000, 7500, 9000, 12000, 18000, 24000, 32000])
        deadhead = random.choice([4, 8, 12, 18, 25, 35, 48])
        pickup_hour = random.choice([8, 9, 10, 11, 13, 14, 15])
        delivery_hour = min(23, pickup_hour + max(3, int(miles / 60)))
        broker = random.choice(BROKERS)
        notes = random.choice([
            "Generated demo marketplace load for MVP testing.",
            "Heuristic return-load candidate. Confirm pickup window and commodity with broker.",
            "Good lane fit if driver can make appointment time.",
            "AI-generated test load. Replace with DAT/Truckstop feed later."
        ])
        loads.append(models.Load(
            company_id=1,
            shipper_name=broker,
            origin_city=origin_city,
            origin_state=origin_state,
            destination_city=dest,
            destination_state=dest_state,
            pickup_time=f"Tomorrow {pickup_hour}:00",
            delivery_time=f"Tomorrow {delivery_hour}:00",
            trailer_type=equipment,
            weight_lbs=weight,
            rate=rate,
            loaded_miles=miles,
            deadhead_miles=deadhead,
            status="available",
            notes=notes
        ))
    return loads
