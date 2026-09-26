const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city");
const dashboard = document.getElementById("dashboard");
const searchButton = searchForm.querySelector("button");
const themeToggle = document.getElementById("theme-toggle");
const themeIcon = themeToggle.querySelector(".theme-icon");
const themeLabel = themeToggle.querySelector(".theme-label");

/**Sets the theme for the application**/
function setTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
  themeIcon.textContent = isDark ? "☼" : "☾";
  themeLabel.textContent = isDark ? "Light mode" : "Dark mode";
  localStorage.setItem("weather-theme", theme);
}

/**Maps weather codes to their corresponding condition and icon**/
const weatherCodes = {
  0: ["Clear sky", "☀"],
  1: ["Mainly clear", "🌤"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁"],
  45: ["Foggy", "〰"],
  48: ["Rime fog", "〰"],
  51: ["Light drizzle", "🌦"],
  53: ["Drizzle", "🌦"],
  55: ["Heavy drizzle", "🌧"],
  61: ["Light rain", "🌦"],
  63: ["Rain", "🌧"],
  65: ["Heavy rain", "🌧"],
  71: ["Light snow", "🌨"],
  73: ["Snow", "🌨"],
  75: ["Heavy snow", "❄"],
  80: ["Rain showers", "🌦"],
  81: ["Rain showers", "🌧"],
  82: ["Heavy showers", "🌧"],
  85: ["Snow showers", "🌨"],
  95: ["Thunderstorm", "⛈"],
  96: ["Thunderstorm with hail", "⛈"],
  99: ["Thunderstorm with hail", "⛈"]
};

/**Displays a message in the dashboard**/
function showMessage(title, message, icon = "!") {
  dashboard.innerHTML = `<div class="message-state"><span class="message-icon" aria-hidden="true">${icon}</span><h2>${title}</h2><p>${message}</p></div>`;
}


function formatTime(isoString) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(isoString));
}

function buildMapUrl(latitude, longitude) {
  const padding = 0.08;
  const bbox = [longitude - padding, latitude - padding, longitude + padding, latitude + padding].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

async function getWeather(city) {
  const query = city.trim();
  if (!query) {
    showMessage("Tell us where to look", "Enter a city name to get the latest conditions.");
    return;
  }

  searchButton.disabled = true;
  searchButton.querySelector("span").textContent = "Loading";
  const safeQuery = query.replace(/[&<>]/g, "");
  dashboard.innerHTML = `<div class="loading-state"><span class="loader" aria-hidden="true"></span><p>Reading the sky over ${safeQuery}...</p></div>`;

  try {
    const locationResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    if (!locationResponse.ok) throw new Error("Location service unavailable");
    const locationData = await locationResponse.json();
    const location = locationData.results?.[0];
    if (!location) throw new Error("CITY_NOT_FOUND");

    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`);
    if (!forecastResponse.ok) throw new Error("Weather service unavailable");
    const data = await forecastResponse.json();
    const current = data.current;
    const [condition, icon] = weatherCodes[current.weather_code] || ["Changing conditions", "☼"];
    const place = [location.name, location.country_code].filter(Boolean).join(", ");

    /**Updates the dashboard with the current weather information**/
    dashboard.innerHTML = `
      <div class="weather-card">
        <div class="weather-heading">
          <div><p class="eyebrow">CURRENT WEATHER</p><h2>${place}</h2><p class="updated">Updated ${formatTime(current.time)} · ${data.timezone_abbreviation}</p></div>
          <span class="condition-icon" aria-hidden="true">${icon}</span>
        </div>
        <div class="temperature-row"><strong>${Math.round(current.temperature_2m)}°</strong><div><p class="condition">${condition}</p><p>Feels like ${Math.round(current.apparent_temperature)}°</p></div></div>
        <div class="metrics">
          <div class="metric"><span class="metric-icon" aria-hidden="true">◌</span><div><span>Humidity</span><strong>${current.relative_humidity_2m}%</strong></div></div>
          <div class="metric"><span class="metric-icon" aria-hidden="true">⌁</span><div><span>Wind speed</span><strong>${Math.round(current.wind_speed_10m)} km/h</strong></div></div>
          <div class="metric"><span class="metric-icon" aria-hidden="true">◒</span><div><span>Precipitation</span><strong>${current.precipitation} mm</strong></div></div>
        </div>
        <div class="map-panel">
          <div class="map-heading"><div><p class="eyebrow">LOCATION MAP</p><h3>${place}</h3></div><span class="map-pin" aria-hidden="true">⌖</span></div>
          <iframe title="Map showing ${place}" src="${buildMapUrl(location.latitude, location.longitude)}" loading="lazy"></iframe>
        </div>
      </div>`;
  } catch (error) {
    if (error.message === "CITY_NOT_FOUND") {
      showMessage("We couldn't find that city", "Check the spelling and try searching again.", "⌕");
    } else {
      showMessage("Weather data is unavailable", "Check your connection and try again in a moment.", "↯");
    }
  } finally {
    searchButton.disabled = false;
    searchButton.querySelector("span").textContent = "Search";
  }
}

/**Handles the form submission to fetch weather data**/
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  getWeather(cityInput.value);
});

themeToggle.addEventListener("click", () => {
  setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

setTheme(localStorage.getItem("weather-theme") || "dark");

