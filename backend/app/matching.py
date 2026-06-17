from .config import get_settings
from .maps import fallback_distance
from .models import Truck, Load

settings = get_settings()

def estimate_distance(a_city: str, a_state: str, b_city: str, b_state: str) -> float:
    return fallback_distance(a_city, a_state, b_city, b_state)

def calculate_profit(truck: Truck, load: Load, deadhead: float, loaded: float) -> dict:
    total_miles = deadhead + loaded
    mpg = max(truck.mpg or settings.default_mpg, 1)
    fuel_cost = (total_miles / mpg) * settings.default_fuel_price
    driver_cost = total_miles * settings.default_driver_cost_per_mile
    toll_cost = total_miles * settings.default_toll_per_mile
    estimated_cost = fuel_cost + driver_cost + toll_cost
    estimated_profit = load.rate - estimated_cost
    rate_per_mile = load.rate / max(total_miles, 1)
    return {
        "fuel_cost": round(fuel_cost, 2),
        "driver_cost": round(driver_cost, 2),
        "toll_cost": round(toll_cost, 2),
        "estimated_cost": round(estimated_cost, 2),
        "estimated_profit": round(estimated_profit, 2),
        "rate_per_mile": round(rate_per_mile, 2),
    }

def calculate_match(truck: Truck, load: Load, route_data: dict | None = None) -> dict:
    deadhead = load.deadhead_miles or estimate_distance(truck.current_city, truck.current_state, load.origin_city, load.origin_state)
    loaded = load.loaded_miles or estimate_distance(load.origin_city, load.origin_state, load.destination_city, load.destination_state)
    if route_data and route_data.get("deadhead_miles") is not None:
        deadhead = route_data["deadhead_miles"]
    if route_data and route_data.get("loaded_miles") is not None:
        loaded = route_data["loaded_miles"]

    costs = calculate_profit(truck, load, deadhead, loaded)
    trailer_fit = truck.trailer_type.lower() == load.trailer_type.lower()
    capacity_fit = truck.capacity_lbs >= load.weight_lbs
    destination_bonus = 0
    if truck.desired_destination_city and truck.desired_destination_state:
        dest_distance = estimate_distance(load.destination_city, load.destination_state, truck.desired_destination_city, truck.desired_destination_state)
        destination_bonus = max(0, 30 - dest_distance / 10)

    score = 0
    score += min(max(costs["estimated_profit"] / 20, -20), 45)
    score += min(costs["rate_per_mile"] * 12, 25)
    score += 20 if trailer_fit else -25
    score += 15 if capacity_fit else -40
    score += destination_bonus
    score -= min(deadhead / 20, 20)
    score = round(max(0, min(score, 100)), 2)

    explanation = (
        f"Estimated profit ${costs['estimated_profit']:,.0f}. Rate per mile ${costs['rate_per_mile']:.2f}. "
        f"Deadhead about {deadhead:.0f} miles and loaded miles about {loaded:.0f}. "
        f"Fuel estimate ${costs['fuel_cost']:,.0f}. Trailer fit: {'yes' if trailer_fit else 'no'}; capacity fit: {'yes' if capacity_fit else 'no'}."
    )
    return {
        "truck_id": truck.id,
        "load_id": load.id,
        "score": score,
        "estimated_profit": costs["estimated_profit"],
        "estimated_cost": costs["estimated_cost"],
        "rate_per_mile": costs["rate_per_mile"],
        "empty_miles_saved": round(max(loaded - deadhead, 0), 2),
        "explanation": explanation,
    }
