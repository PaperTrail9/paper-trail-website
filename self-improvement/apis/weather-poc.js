/**
 * Weather API Proof of Concept
 * Demonstrates contextual automation with OpenWeatherMap One Call 3.0
 * 
 * Setup:
 * 1. Sign up at https://openweathermap.org/
 * 2. Subscribe to One Call 3.0 (1,000 free calls/day)
 * 3. Set env var: OPENWEATHER_API_KEY
 */

const axios = require('axios');

const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/3.0';

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000; // 10 minutes (API updates every 10 min)
  }

  async makeRequest(endpoint, params) {
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${WEATHER_BASE_URL}${endpoint}`, {
        params: {
          ...params,
          appid: this.apiKey,
        },
      });

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      console.error('Weather API error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * USE CASE 1: Smart Dinner Planning
   * Adjust meal plans based on weather
   */
  async getWeatherForMealPlanning(lat, lon) {
    const data = await this.makeRequest('/onecall', {
      lat,
      lon,
      exclude: 'minutely', // Skip minute-by-minute data
      units: 'imperial',
    });

    return this.analyzeWeatherForMeals(data);
  }

  analyzeWeatherForMeals(weatherData) {
    const current = weatherData.current;
    const daily = weatherData.daily[0]; // Today's forecast
    const alerts = weatherData.alerts || [];

    const analysis = {
      current: {
        temp: Math.round(current.temp),
        feelsLike: Math.round(current.feels_like),
        humidity: current.humidity,
        conditions: current.weather[0].main,
        description: current.weather[0].description,
        icon: current.weather[0].icon,
      },
      mealRecommendations: [],
      cookingConditions: {},
      alerts: alerts.map(a => ({
        event: a.event,
        start: new Date(a.start * 1000),
        end: new Date(a.end * 1000),
        description: a.description,
      })),
    };

    // Temperature-based recommendations
    if (current.temp > 90) {
      analysis.mealRecommendations.push({
        type: 'avoid_heavy_cooking',
        reason: 'Hot weather - avoid oven/heavy cooking',
        suggestions: ['grilling', 'cold salads', 'no-cook meals', 'slow cooker'],
      });
      analysis.cookingConditions.preferredMethod = 'grill_outside';
    } else if (current.temp < 40) {
      analysis.mealRecommendations.push({
        type: 'comfort_food',
        reason: 'Cold weather - hearty meals preferred',
        suggestions: ['soups', 'stews', 'casseroles', 'roasted dishes'],
      });
      analysis.cookingConditions.preferredMethod = 'oven_braise';
    }

    // Weather conditions
    if (current.weather[0].main === 'Rain' || current.weather[0].main === 'Thunderstorm') {
      analysis.mealRecommendations.push({
        type: 'indoor_cooking',
        reason: 'Rainy weather - indoor activities',
        suggestions: ['one-pot meals', 'comfort food', 'baking'],
      });
      analysis.cookingConditions.grillSuitable = false;
    } else if (current.weather[0].main === 'Clear' && current.temp > 60 && current.temp < 85) {
      analysis.cookingConditions.grillSuitable = true;
      analysis.mealRecommendations.push({
        type: 'outdoor_friendly',
        reason: 'Perfect grilling weather',
        suggestions: ['BBQ', 'grilled vegetables', 'outdoor dining'],
      });
    }

    // Humidity affects dough/proofing
    if (current.humidity > 70) {
      analysis.cookingConditions.bakingNotes = 'High humidity - reduce liquid in dough recipes';
    }

    return analysis;
  }

  /**
   * USE CASE 2: Pickup Time Optimization
   * Suggest optimal grocery pickup times
   */
  async suggestPickupTimes(lat, lon, preferredTime = '18:00') {
    const data = await this.makeRequest('/onecall', {
      lat,
      lon,
      exclude: 'minutely,daily',
      units: 'imperial',
    });

    const hourly = data.hourly;
    const [prefHour] = preferredTime.split(':').map(Number);

    // Analyze weather around preferred time
    const timeWindow = hourly.slice(prefHour - 2, prefHour + 3);
    
    const suggestions = timeWindow.map((hour, idx) => {
      const hourNum = prefHour - 2 + idx;
      const time = `${hourNum}:00`;
      const conditions = hour.weather[0].main;
      const temp = Math.round(hour.temp);
      const pop = hour.pop * 100; // Probability of precipitation

      let score = 100;
      let concerns = [];

      // Rain penalty
      if (conditions === 'Rain') {
        score -= 40;
        concerns.push('rain expected');
      } else if (conditions === 'Thunderstorm') {
        score -= 60;
        concerns.push('storms likely');
      }

      // Temperature penalty
      if (temp > 95) {
        score -= 20;
        concerns.push('extreme heat');
      } else if (temp < 32) {
        score -= 20;
        concerns.push('freezing temps');
      }

      // Precipitation probability
      if (pop > 70) {
        score -= 30;
        concerns.push('high rain chance');
      }

      return {
        time,
        temp,
        conditions: hour.weather[0].description,
        rainChance: pop,
        score: Math.max(0, score),
        concerns,
        recommended: score >= 80,
      };
    });

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    return {
      preferredTime,
      optimalWindow: suggestions[0],
      alternatives: suggestions.slice(1, 3),
      allOptions: suggestions,
    };
  }

  /**
   * USE CASE 3: Weekly Meal Planning with Weather
   * Get 7-day forecast for meal planning
   */
  async getWeeklyMealForecast(lat, lon) {
    const data = await this.makeRequest('/onecall', {
      lat,
      lon,
      exclude: 'current,minutely,hourly,alerts',
      units: 'imperial',
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();

    return data.daily.slice(0, 7).map((day, idx) => {
      const dayName = days[(today + idx) % 7];
      const date = new Date(day.dt * 1000);
      
      return {
        day: dayName,
        date: date.toISOString().split('T')[0],
        temp: {
          min: Math.round(day.temp.min),
          max: Math.round(day.temp.max),
          day: Math.round(day.temp.day),
        },
        conditions: day.weather[0].main,
        description: day.weather[0].description,
        rainChance: day.pop * 100,
        humidity: day.humidity,
        mealSuggestion: this.suggestMealForWeather(day),
        cookingMethod: this.suggestCookingMethod(day),
      };
    });
  }

  suggestMealForWeather(dayData) {
    const temp = dayData.temp.day;
    const conditions = dayData.weather[0].main;
    const pop = dayData.pop;

    if (conditions === 'Rain' || pop > 0.6) {
      return { type: 'comfort', examples: ['soup', 'stew', 'chili', 'mac and cheese'] };
    }
    
    if (temp > 85) {
      return { type: 'light', examples: ['salad', 'cold pasta', 'grilled fish', 'tacos'] };
    }
    
    if (temp < 50) {
      return { type: 'hearty', examples: ['roast', 'casserole', 'pasta bake', 'curry'] };
    }

    return { type: 'versatile', examples: ['stir fry', 'grilled chicken', 'pasta', 'burgers'] };
  }

  suggestCookingMethod(dayData) {
    const temp = dayData.temp.day;
    const conditions = dayData.weather[0].main;

    if (conditions === 'Rain' || conditions === 'Snow') {
      return { primary: 'oven', secondary: 'stovetop', outdoor: false };
    }
    
    if (temp > 90) {
      return { primary: 'grill', secondary: 'no-cook', outdoor: true, note: 'Early morning or evening grilling recommended' };
    }
    
    if (temp > 60 && temp < 85 && conditions === 'Clear') {
      return { primary: 'grill', secondary: 'oven', outdoor: true };
    }

    return { primary: 'oven', secondary: 'stovetop', outdoor: false };
  }

  /**
   * USE CASE 4: Smart Alerts for Meal Planning
   * Get weather alerts that affect cooking plans
   */
  async getMealPlanningAlerts(lat, lon) {
    const data = await this.makeRequest('/onecall', {
      lat,
      lon,
      exclude: 'current,minutely,hourly,daily',
    });

    const alerts = data.alerts || [];
    
    return alerts.map(alert => {
      const mealImpact = this.assessMealImpact(alert);
      
      return {
        event: alert.event,
        severity: alert.tags?.[0] || 'unknown',
        start: new Date(alert.start * 1000),
        end: new Date(alert.end * 1000),
        description: alert.description,
        mealImpact,
        actionRequired: mealImpact.severity === 'high',
      };
    });
  }

  assessMealImpact(alert) {
    const event = alert.event.toLowerCase();
    
    if (event.includes('heat') || event.includes('excessive heat')) {
      return {
        severity: 'high',
        recommendation: 'Avoid oven cooking. Use grill early morning or prepare no-cook meals.',
        prepAdjustment: 'Prep ingredients early morning, assemble cold meals',
      };
    }
    
    if (event.includes('winter') || event.includes('ice') || event.includes('snow')) {
      return {
        severity: 'medium',
        recommendation: 'Comfort foods ideal. May want to double recipes for leftovers.',
        prepAdjustment: 'Stock up on pantry staples, consider batch cooking',
      };
    }
    
    if (event.includes('thunderstorm') || event.includes('tornado')) {
      return {
        severity: 'high',
        recommendation: 'Avoid outdoor cooking. Have backup indoor meal plan.',
        prepAdjustment: 'Move grill items to oven/stovetop alternatives',
      };
    }

    return { severity: 'low', recommendation: 'No major meal adjustments needed' };
  }

  /**
   * USE CASE 5: AI Weather Assistant Integration
   * Natural language weather queries
   */
  async askWeatherAssistant(question, sessionId = null) {
    // Note: This uses the AI Weather Assistant endpoint
    // Requires separate session management
    
    const url = sessionId 
      ? `${WEATHER_BASE_URL}/assistant/session/${sessionId}`
      : `${WEATHER_BASE_URL}/assistant/session`;

    try {
      const response = await axios.post(url, {
        prompt: question,
      }, {
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      return {
        answer: response.data.answer,
        data: response.data.data,
        sessionId: response.data.session_id,
      };
    } catch (error) {
      console.error('AI Assistant error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Integration: Dinner Automation Hook
   * Main entry point for dinner automation system
   */
  async getDinnerContext(preferences = {}) {
    // Default to Austin, TX coordinates (update for your location)
    const lat = preferences.lat || 30.2672;
    const lon = preferences.lon || -97.7431;

    const [weather, pickupTimes, weeklyForecast] = await Promise.all([
      this.getWeatherForMealPlanning(lat, lon),
      this.suggestPickupTimes(lat, lon, preferences.preferredPickupTime),
      this.getWeeklyMealForecast(lat, lon),
    ]);

    return {
      currentWeather: weather,
      pickupRecommendation: pickupTimes,
      weeklyForecast: weeklyForecast.slice(0, 3), // Next 3 days
      summary: this.generateSummary(weather, pickupTimes),
    };
  }

  generateSummary(weather, pickup) {
    const parts = [];
    
    parts.push(`Currently ${weather.current.temp}°F and ${weather.current.description}`);
    
    if (weather.alerts.length > 0) {
      parts.push(`⚠️ Weather alert: ${weather.alerts[0].event}`);
    }
    
    parts.push(`🍽️ ${weather.mealRecommendations[0]?.suggestions.slice(0, 2).join(' or ')} recommended`);
    parts.push(`🛒 Best pickup time: ${pickup.optimalWindow.time}`);

    return parts.join('. ');
  }
}

// Demo runner
async function demo() {
  console.log('=== Weather API Integration Demo ===\n');

  if (!process.env.OPENWEATHER_API_KEY) {
    console.log('Note: Set OPENWEATHER_API_KEY to test with real API');
    console.log('Sign up at https://openweathermap.org/ and subscribe to One Call 3.0');
    console.log('(1,000 free calls/day)\n');
  }

  const weather = new WeatherService();

  // Demo coordinates (Austin, TX)
  const lat = 30.2672;
  const lon = -97.7431;

  // Demo 1: Meal planning weather
  console.log('Demo 1: Smart Meal Planning Weather');
  try {
    const mealWeather = await weather.getWeatherForMealPlanning(lat, lon);
    console.log('Current temp:', mealWeather.current.temp + '°F');
    console.log('Conditions:', mealWeather.current.description);
    console.log('Recommendations:', mealWeather.mealRecommendations.map(r => r.type).join(', '));
  } catch (e) {
    console.log('API call skipped:', e.message);
  }

  // Demo 2: Pickup optimization
  console.log('\nDemo 2: Pickup Time Optimization');
  try {
    const pickup = await weather.suggestPickupTimes(lat, lon, '18:00');
    console.log('Preferred time:', pickup.preferredTime);
    console.log('Optimal window:', pickup.optimalWindow.time, `(score: ${pickup.optimalWindow.score})`);
  } catch (e) {
    console.log('API call skipped:', e.message);
  }

  // Demo 3: Weekly forecast
  console.log('\nDemo 3: Weekly Meal Forecast');
  try {
    const weekly = await weather.getWeeklyMealForecast(lat, lon);
    console.log('Next 3 days:');
    weekly.slice(0, 3).forEach(day => {
      console.log(`  ${day.day}: ${day.temp.max}°F, ${day.description} → ${day.mealSuggestion.type} meals`);
    });
  } catch (e) {
    console.log('API call skipped:', e.message);
  }

  // Demo 4: Full dinner context
  console.log('\nDemo 4: Complete Dinner Context');
  try {
    const context = await weather.getDinnerContext({ preferredPickupTime: '18:00' });
    console.log('Summary:', context.summary);
  } catch (e) {
    console.log('API call skipped:', e.message);
  }

  console.log('\nDemo complete!');
}

module.exports = {
  WeatherService,
};

if (require.main === module) {
  demo();
}
