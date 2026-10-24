// NASA API Service Template
// You can get a free API key at https://api.nasa.gov/ or use DEMO_KEY for quick testing

const NASA_API_BASE = 'https://api.nasa.gov';
const API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';

/**
 * Fetch Astronomy Picture of the Day (APOD)
 */
export async function getAstronomyPictureOfTheDay() {
  const response = await fetch(`${NASA_API_BASE}/planetary/apod?api_key=${API_KEY}`);
  if (!response.ok) {
    throw new Error(`NASA API error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch local preprocessed NASA dataset from /public/data
 */
export async function getLocalNasaData() {
  const response = await fetch('/data/sample_nasa_data.json');
  return response.json();
}
