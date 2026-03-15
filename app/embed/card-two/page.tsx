"use client";
import { FeatureCardPlayer } from "../../components/FeatureCardPlayer";

export default function EmbedCardTwo() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#101010", overflow: "hidden" }}>
      <FeatureCardPlayer card="two" />
    </div>
  );
}
