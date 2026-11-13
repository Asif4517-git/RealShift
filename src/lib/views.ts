export type AppView = "dyno" | "garage" | "data" | "about";

export const VIEW_LABELS: Record<AppView, string> = {
  dyno: "Dyno Bay",
  garage: "Garage",
  data: "Data Log",
  about: "About",
};
