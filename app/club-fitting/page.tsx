import type { Metadata } from "next";
import { ClubFittingClient } from "@/components/ClubFittingClient";

export const metadata: Metadata = {
  title: "Club fitting — JustSwangin",
  description:
    "Fitting-style shaft, loft, and head recommendations from your Swing Lab metrics and optional launch-monitor data.",
};

export default function ClubFittingPage() {
  return <ClubFittingClient />;
}
