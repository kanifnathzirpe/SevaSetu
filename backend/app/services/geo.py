from math import asin, cos, radians, sin, sqrt

PUNE_CENTER = (18.5204, 73.8567)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return round(2 * r * asin(sqrt(a)), 2)


def eta_minutes(distance_km: float, avg_speed_kmph: float = 32.0) -> int:
    return max(3, int(round(distance_km / avg_speed_kmph * 60)) + 2)
