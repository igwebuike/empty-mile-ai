from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Empty Mile AI"
    database_url: str = "sqlite:///./empty_mile_ai.db"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"

    google_maps_api_key: str | None = None
    routes_api_key: str | None = None
    geocoding_api_key: str | None = None
    places_api_key: str | None = None
    maps_javascript_api_key: str | None = None
    route_optimization_api_key: str | None = None
    directions_api_key: str | None = None
    distance_matrix_api_key: str | None = None

    default_fuel_price: float = 3.65
    default_mpg: float = 7.0
    default_driver_cost_per_mile: float = 0.65
    default_toll_per_mile: float = 0.03

    @property
    def maps_key(self) -> str | None:
        return self.google_maps_api_key or self.routes_api_key or self.geocoding_api_key

    class Config:
        env_file = ".env"
        extra = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()
