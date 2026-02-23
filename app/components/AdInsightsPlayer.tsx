"use client";
import { Player } from "@remotion/player";
import { AdInsightsComposition } from "./AdInsightsComposition";

export const AdInsightsPlayer = () => {
  return (
    <Player
      component={AdInsightsComposition}
      compositionWidth={400}
      compositionHeight={540}
      durationInFrames={150}
      fps={30}
      style={{ width: "100%", height: "100%" }}
      autoPlay
      loop
    />
  );
};
