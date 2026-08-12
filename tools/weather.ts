import { tool } from "ai"
import { z } from "zod"

// Compact WMO weather-code lookup (Open-Meteo uses the WMO code table).
const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
}

function describeWeatherCode(code: number): string {
  return WEATHER_CODES[code] ?? "Unknown"
}

export const getWeather = tool({
  description:
    "Get the current weather for a location by name (e.g. a city). Uses free, keyless geocoding and forecast data.",
  inputSchema: z.object({
    location: z.string().describe('Location name, e.g. "Paris" or "Tokyo"'),
  }),
  outputSchema: z.union([
    z.object({ error: z.string() }),
    z.object({
      location: z.string(),
      temperatureC: z.number(),
      feelsLikeC: z.number(),
      humidityPct: z.number(),
      windKmh: z.number(),
      condition: z.string(),
    }),
  ]),
  execute: async ({ location }) => {
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
        { signal: AbortSignal.timeout(10_000) }
      )
      if (!geoRes.ok) {
        return { error: `Could not geocode "${location}".` }
      }
      const geoData = await geoRes.json()
      const place = geoData?.results?.[0]
      if (!place) {
        return { error: "Location not found" }
      }

      const forecastRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`,
        { signal: AbortSignal.timeout(10_000) }
      )
      if (!forecastRes.ok) {
        return { error: `Could not fetch forecast for "${location}".` }
      }
      const forecastData = await forecastRes.json()
      const current = forecastData?.current
      if (!current) {
        return { error: `No current weather data for "${location}".` }
      }

      return {
        location: [place.name, place.country].filter(Boolean).join(", "),
        temperatureC: Number(current.temperature_2m),
        feelsLikeC: Number(current.apparent_temperature),
        humidityPct: Number(current.relative_humidity_2m),
        windKmh: Number(current.wind_speed_10m),
        condition: describeWeatherCode(Number(current.weather_code)),
      }
    } catch {
      return { error: `Could not fetch weather for "${location}".` }
    }
  },
})
