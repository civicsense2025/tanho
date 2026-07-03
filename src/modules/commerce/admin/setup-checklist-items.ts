import type { SetupChecklistItem } from "./SetupChecklist";

/** Builds the store setup checklist from server-resolved booleans. */
export function setupChecklistItems(state: {
  stripeConnected: boolean;
  hasProduct: boolean;
  hasShippingZone: boolean;
}): SetupChecklistItem[] {
  return [
    { label: "Connect payments", done: state.stripeConnected },
    { label: "Add your first product", done: state.hasProduct },
    { label: "Set up shipping", done: state.hasShippingZone },
  ];
}
