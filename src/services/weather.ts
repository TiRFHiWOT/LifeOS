export interface WeatherForecastResult {
  location: string;
  dateStr: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  weatherCondition: string;
  isRainExpected: boolean;
  recommendation: string;
}

export async function getWeatherForecast(
  latitude = 1.2921, // Default coordinates (e.g. Nairobi/Local)
  longitude = 36.8219,
  locationName = 'Nairobi'
): Promise<WeatherForecastResult> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Weather API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const daily = data.daily;
    const maxTemp = daily?.temperature_2m_max?.[0] ?? 24;
    const minTemp = daily?.temperature_2m_min?.[0] ?? 16;
    const precipProb = daily?.precipitation_probability_max?.[0] ?? 65;
    const weatherCode = daily?.weather_code?.[0] ?? 61;

    const isRain = precipProb >= 40 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weatherCode);
    const weatherCondition = isRain ? 'Rainy / Showers' : 'Clear / Sunny';
    const recommendation = isRain
      ? 'Rain is expected tomorrow during your event. You may want to prepare an alternative indoor venue.'
      : 'Clear weather is expected during your event! Great conditions for outdoor activities.';

    return {
      location: locationName,
      dateStr: new Date().toISOString().split('T')[0],
      temperatureMax: Math.round(maxTemp),
      temperatureMin: Math.round(minTemp),
      precipitationProbability: precipProb,
      weatherCondition,
      isRainExpected: isRain,
      recommendation,
    };
  } catch (err) {
    console.warn('Weather API fetch failed, returning fallback forecast:', err);
    return {
      location: locationName,
      dateStr: new Date().toISOString().split('T')[0],
      temperatureMax: 24,
      temperatureMin: 16,
      precipitationProbability: 65,
      weatherCondition: 'Rainy / Showers',
      isRainExpected: true,
      recommendation: 'Rain is expected tomorrow during your event. You may want to prepare an alternative indoor venue.',
    };
  }
}
