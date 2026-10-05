import type { Metadata } from "next";
import { PuttAssistClient } from "@/components/PuttAssistClient";

export const metadata: Metadata = {
  title: "Putt assist — JustSwangin",
  description:
    "Live camera view of the cup with putt line overlay; phone on the ground reads slope and estimates aim from distance and Stimp.",
};

export default function PuttAssistPage() {
  return <PuttAssistClient />;
}
