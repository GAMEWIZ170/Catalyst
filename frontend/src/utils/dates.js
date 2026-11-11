// "12 Dec 2026"
export const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
  : "");
