import aiohttp
import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
AIR_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    61: "Rain",
    71: "Snow",
    80: "Rain showers",
    95: "Thunderstorm"
}


class Weather(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="weather",
        description="Get detailed weather information for a city")
    @app_commands.describe(location="City name (e.g. Lucknow, Delhi, Amethi)")
    async def weather(self, interaction: discord.Interaction, location: str):
        await interaction.response.defer()

        try:
            async with aiohttp.ClientSession() as session:
                # ── 1️⃣ Geocode
                async with session.get(GEOCODE_URL,
                                       params={
                                           "name": location,
                                           "count": 1
                                       },
                                       timeout=10) as r:
                    geo = await r.json()

                if not geo.get("results"):
                    raise ValueError("Location not found")

                place = geo["results"][0]
                lat, lon = place["latitude"], place["longitude"]
                city = place["name"]
                country = place.get("country", "")

                # ── 2️⃣ Weather
                async with session.get(WEATHER_URL,
                                       params={
                                           "latitude": lat,
                                           "longitude": lon,
                                           "current_weather": "true",
                                           "hourly":
                                           "relativehumidity_2m,uv_index",
                                           "daily": "sunrise,sunset",
                                           "timezone": "auto"
                                       },
                                       timeout=10) as r:
                    weather = await r.json()

                current = weather["current_weather"]
                humidity = weather["hourly"]["relativehumidity_2m"][0]
                uv = weather["hourly"]["uv_index"][0]
                sunrise = weather["daily"]["sunrise"][0]
                sunset = weather["daily"]["sunset"][0]

                condition = WEATHER_CODES.get(current["weathercode"],
                                              "Unknown")

                # ── 3️⃣ Air Quality
                async with session.get(AIR_URL,
                                       params={
                                           "latitude": lat,
                                           "longitude": lon,
                                           "hourly": "us_aqi"
                                       },
                                       timeout=10) as r:
                    air = await r.json()

                aqi = air["hourly"]["us_aqi"][0]

        except ValueError:
            embed = make_embed(title="Location Not Found",
                               description="Please enter a valid city name.",
                               level="WARNING")
            return await interaction.followup.send(embed=embed)

        except Exception:
            embed = make_embed(
                title="Weather Error",
                description=
                "Failed to fetch weather data. Please try again later.",
                level="ERROR")
            return await interaction.followup.send(embed=embed)

        # ── Output
        embed = make_embed(
            title=f"Weather — {city}",
            description=f"Current conditions in {city}, {country}",
            level="INFO",
            fields=[
                ("Condition", condition, True),
                ("Temperature", f"{current['temperature']} °C", True),
                ("Wind Speed", f"{current['windspeed']} km/h", True),
                ("Humidity", f"{humidity} %", True),
                ("UV Index", str(uv), True),
                ("Air Quality (AQI)", str(aqi), True),
                ("Sunrise", sunrise, True),
                ("Sunset", sunset, True),
            ],
            footer=f"Requested by {interaction.user}")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Weather(bot))
