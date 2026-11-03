import type { HouseType } from "../../../shared/deal";

// The same solid icon set as the scroll story: one per kind of property, windows cut out in the card colour.
const SHAPES: Record<HouseType, string> = {
  lot: "M3 30h34v2H3zM5 19h30v2H5zM5 25h30v2H5zM6 17h2v13H6zm8 0h2v13h-2zm8 0h2v13h-2zm8 0h2v13h-2zM33 13a4 4 0 1 1 0 .1zM32 16h2v14h-2z",
  cottage: "M10 30V19L20 11l10 8v11zM8 20L20 10l12 10h-3L20 13l-9 7z",
  house: "M7 30V17L20 7l13 10v13zM5 18L20 6l15 12h-3L20 9 8 18z",
  family: "M4 30V17l9-8 9 8v13zM2 18L13 8l11 10h-3l-8-7-8 7zM21 30v-9l7-5 9 6v8z",
  large: "M5 30V12h30v18zM3 11h34v3H3zM14 11l6-6 6 6z",
  modern: "M7 30V12h26v18zM5 10h30v3H5zM24 6h5v4h-5z",
};
const CUTS: Record<HouseType, string> = {
  lot: "",
  cottage: "M18 30v-5a2 2 0 0 1 4 0v5z",
  house: "M12 30v-6a2 2 0 0 1 4 0v6zM23 20h5v4h-5z",
  family: "M8 30v-5a2 2 0 0 1 4 0v5zM28 30v-5h6v5z",
  large: "M18 30v-5a2 2 0 0 1 4 0v5zM9 16h4v3H9zm7 0h4v3h-4zm8 0h4v3h-4zm8 0h0zM9 22h4v3H9zm18-6h4v3h-4zm0 6h4v3h-4z",
  modern: "M11 17h18v5H11zM23 30v-6h4v6z",
};

export function HouseIcon({ type, className }: { type: HouseType; className?: string }) {
  return (
    <svg viewBox="0 0 40 34" className={className} role="img" aria-label={type === "lot" ? "Land only" : `${type} house`}>
      <path d={SHAPES[type]} fill="currentColor" />
      {CUTS[type] && <path d={CUTS[type]} className="fill-card" />}
    </svg>
  );
}
