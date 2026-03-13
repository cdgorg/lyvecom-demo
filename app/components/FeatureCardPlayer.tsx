"use client";
import { Player } from "@remotion/player";
import {
  CardOneComposition,
  CardTwoComposition,
  CardThreeComposition,
} from "./FeatureCardComposition";
import type { TextRevealMode } from "./FeatureCardComposition";
import { useMemo } from "react";

const compositions = {
  one: CardOneComposition,
  two: CardTwoComposition,
  three: CardThreeComposition,
} as const;

const durations: Record<string, number> = {
  one: 385,
  two: 330,
  three: 300,
};

export const FeatureCardPlayer = ({
  card,
  textRevealMode,
}: {
  card: "one" | "two" | "three";
  textRevealMode?: TextRevealMode;
}) => {
  const inputProps = useMemo(
    () => ({ textRevealMode: textRevealMode ?? "blur-stream" }),
    [textRevealMode]
  );

  return (
    <Player
      component={compositions[card]}
      inputProps={card === "one" ? inputProps : {}}
      compositionWidth={400}
      compositionHeight={400}
      durationInFrames={durations[card]}
      fps={30}
      style={{ width: "100%", height: "100%" }}
      autoPlay
      loop
    />
  );
};
