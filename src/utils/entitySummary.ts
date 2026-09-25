export const getEntityDescription = (
  item: Record<string, any> | null | undefined,
) => {
  if (!item) return "";

  const value =
    item.overview ||
    item.description ||
    item.synopsis ||
    item.biography ||
    item.goals ||
    item.biology ||
    item.summary ||
    "";

  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
};
