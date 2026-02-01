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

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="weather",
        description="Get detailed weather information for a city",
    )
    async def weather(self, ctx: commands.Context, location: str):
        if ctx.interaction:
            await ctx.interaction.response.defer()

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                        GEOCODE_URL,
                        params={
                            "name": location,
                            "count": 1
                        },
                        timeout=10,  # type: ignore
                ) as r:
                    geo = await r.json()

                if not geo.get("results"):
                    raise ValueError("Location not found")

                place = geo["results"][0]
                lat, lon = place["latitude"], place["longitude"]
                city = place["name"]
                country = place.get("country", "")

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
                        timeout=10,  # type: ignore
                ) as r:
                    weather = await r.json()

                current = weather["current_weather"]
                humidity = weather["hourly"]["relativehumidity_2m"][0]
                uv = max(weather["hourly"]["uv_index"])

                sunrise = format_time(weather["daily"]["sunrise"][0])
                sunset = format_time(weather["daily"]["sunset"][0])

                condition = WEATHER_CODES.get(current["weathercode"],
                                              "Unknown")

                async with session.get(
                        AIR_URL,
                        params={
                            "latitude": lat,
                            "longitude": lon,
                            "hourly": "us_aqi",
                        },
                        timeout=10,  # type: ignore
                ) as r:
                    air = await r.json()

                aqi = air["hourly"]["us_aqi"][0]

        except ValueError:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Location not found",
                description=
                "I couldn’t find that place. Please try a valid city name.",
                level="WARNING",
            )
            return await ctx.reply(embed=embed, mention_author=False)

        except Exception:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Weather service error",
                description=
                "Something went wrong while fetching weather data. Please try again later.",
                level="ERROR",
            )
            return await ctx.reply(embed=embed, mention_author=False)

        embed = make_embed(
            title=f"{EMOJIS['success']} Weather Update",
            description=(
                f"{EMOJIS['arrow_point']} **Location:** {city}, {country}\n"
                f"{EMOJIS['green_dot']} Live conditions overview"),
            level="INFO",
            fields=[
                ("🌤️ Condition", condition, True),
                ("🌡️ Temperature", f"{current['temperature']} °C", True),
                ("💨 Wind", f"{current['windspeed']} km/h", True),
                ("💧 Humidity", f"{humidity} %", True),
                ("☀️ UV (Max Today)", str(uv), True),
                ("🏭 Air Quality", f"AQI {aqi}", True),
                ("🌅 Sunrise", sunrise, True),
                ("🌇 Sunset", sunset, True),
            ],
            footer=f"Requested by {ctx.author}",
        )

        # Slash command response
        if ctx.interaction:
            await ctx.reply(embed=embed)
            return

        # Prefix command cleanup
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

        await ctx.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Weather(bot))
