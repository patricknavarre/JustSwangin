import type { Metadata } from "next";
import { RangeFinderClient } from "@/components/RangeFinderClient";

export const metadata: Metadata = {
  title: "Range finder — JustSwangin",
  description:
    "Camera sight picture with GPS yardage to a map pin and terrain elevation along the line of sight.",
};

export default function RangeFinderPage() {
  return <RangeFinderClient />;
}
