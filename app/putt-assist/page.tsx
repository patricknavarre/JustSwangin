import type { Metadata } from "next";
import { PuttAssistClient } from "@/components/PuttAssistClient";

export const metadata: Metadata = {
  title: "Putt assist — JustSwangin",
  description:
    "Camera HUD with phone motion sensors to read green slope and estimate putt aim offset from distance and Stimp.",
};

export default function PuttAssistPage() {
  return <PuttAssistClient />;
}
