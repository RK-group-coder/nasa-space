export interface NasaMissionInfo {
  mission: string;
  team: string;
  description: string;
}

export interface NasaApodResponse {
  date: string;
  explanation: string;
  hdurl?: string;
  media_type: string;
  service_version: string;
  title: string;
  url: string;
}
