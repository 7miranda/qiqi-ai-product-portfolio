"use client";

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AmbientAudio() {
  const [on, setOn] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const toggle = async () => {
    if (!context.current) {
      const audio = new AudioContext();
      const output = audio.createGain(); output.gain.value = 0.018; output.connect(audio.destination);
      [55, 82.5, 110].forEach((frequency, index) => { const oscillator = audio.createOscillator(); const level = audio.createGain(); oscillator.type = index === 0 ? "sine" : "triangle"; oscillator.frequency.value = frequency; level.gain.value = index === 0 ? .5 : .12; oscillator.connect(level).connect(output); oscillator.start(); });
      context.current = audio; gain.current = output;
    }
    if (on) await context.current.suspend(); else await context.current.resume();
    setOn(!on);
  };
  return <Button className="sound-toggle" variant="outline" onClick={toggle} aria-label={on ? "关闭大厦声场" : "开启大厦声场"}>{on ? <Volume2 /> : <VolumeX />}<span>声场 {on ? "ON" : "OFF"}</span></Button>;
}
