import aiohttp
import discord
from discord.ext import commands
from datetime import datetime

from utils.embeds import make_embed
from utils.emojis import EMOJIS

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
    95: "Thunderstorm",
}


def format_time(value: str) -> str:
    return datetime.fromisoformat(value).strftime("%H:%M")


class Weather(commands.Cog):
    """
    Weather information commands.

    Provides real-time weather, air quality, and solar data
    using the Open-Meteo API.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="weather",
        description="Get detailed weather information for a city",
    )
    async def weather(
        self,
        ctx: commands.Context,
        *,
        location: str,
    ) -> None:

        # ── Slash-safe defer
        if ctx.interaction:
            await ctx.interaction.response.defer()

        try:
            async with aiohttp.ClientSession() as session:

                # ─────────────────────────────
                # Geocoding
                # ─────────────────────────────
                async with session.get(
                        GEOCODE_URL,
                        params={
                            "name": location,
                            "count": 1
                        },
                        timeout=aiohttp.ClientTimeout(total=10),
                ) as r:
                    geo = await r.json()

                if not geo.get("results"):
                    raise ValueError("Location not found")

                place = geo["results"][0]
                lat = place["latitude"]
                lon = place["longitude"]
                city = place["name"]
                country = place.get("country", "")

                # ─────────────────────────────
                # Weather data
                # ─────────────────────────────
                async with session.get(
                    WEATHER_URL,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "current_weather": "true",
                        "hourly": "relativehumidity_2m,uv_index",
                        "daily": "sunrise,sunset",
                        "timezone": "auto",
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as r:
                    weather = await r.json()

                current = weather["current_weather"]
                humidity = weather["hourly"]["relativehumidity_2m"][0]
                uv = max(weather["hourly"]["uv_index"])

                sunrise = format_time(weather["daily"]["sunrise"][0])
                sunset = format_time(weather["daily"]["sunset"][0])

                condition = WEATHER_CODES.get(current["weathercode"],
                                              "Unknown")

                # ─────────────────────────────
                # Air quality
                # ─────────────────────────────
                async with session.get(
                    AIR_URL,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "hourly": "us_aqi",
                    },
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as r:
                    air = await r.json()

                aqi = air["hourly"]["us_aqi"][0]

        except ValueError:
            embed = make_embed(
                title="Location not found",
                description=("I couldn’t find that location.\n"
                             "Please provide a valid city name."),
                level="WARNING",
            )
            await self._respond(ctx, embed)
            return

        except Exception:
            embed = make_embed(
                title="Weather service error",
                description=("An error occurred while fetching weather data.\n"
                             "Please try again later."),
                level="ERROR",
            )
            await self._respond(ctx, embed)
            return

        # ─────────────────────────────
        # Success embed
        # ─────────────────────────────
        embed = make_embed(
            title="Weather Update",
            description=(
                f"{EMOJIS['arrow_point']} **Location:** {city}, {country}\n"
                f"{EMOJIS['green_dot']} Live conditions overview"),
            level="INFO",
            fields=[
                ("Condition", condition, True),
                ("Temperature", f"{current['temperature']} °C", True),
                ("Wind Speed", f"{current['windspeed']} km/h", True),
                ("Humidity", f"{humidity} %", True),
                ("UV Index (Max)", str(uv), True),
                ("Air Quality", f"AQI {aqi}", True),
                ("Sunrise", sunrise, True),
                ("Sunset", sunset, True),
            ],
            footer=f"Requested by {ctx.author}",
        )

        await self._respond(ctx, embed)

    # ─────────────────────────────
    # Unified response helper
    # ─────────────────────────────
    async def _respond(
        self,
        ctx: commands.Context,
        embed: discord.Embed,
    ) -> None:

        if ctx.interaction:
            await ctx.reply(embed=embed)
            return

        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

        await ctx.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Weather(bot))
