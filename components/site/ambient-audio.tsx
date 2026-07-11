"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AmbientAudio() {
  const [on, setOn] = useState(false);
  const context = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const ensureAudio = () => {
    if (!context.current) {
      const audio = new AudioContext();
      const output = audio.createGain(); output.gain.value = 0.012; output.connect(audio.destination);
      [55, 82.5, 110, 146.8].forEach((frequency, index) => { const oscillator = audio.createOscillator(); const level = audio.createGain(); oscillator.type = index < 2 ? "sine" : "triangle"; oscillator.frequency.value = frequency; level.gain.value = index === 0 ? .38 : .07; oscillator.connect(level).connect(output); oscillator.start(); });
      const pulse = audio.createOscillator(); const pulseDepth = audio.createGain(); pulse.frequency.value = .58; pulseDepth.gain.value = .004; pulse.connect(pulseDepth).connect(output.gain); pulse.start();
      context.current = audio; gain.current = output;
    }
    return context.current;
  };
  const toggle = async () => {
    const audio = ensureAudio();
    if (on) await audio.suspend(); else await audio.resume();
    setOn(!on);
  };
  useEffect(() => {
    const start = async () => {
      try { const audio = ensureAudio(); await audio.resume(); setOn(audio.state === "running"); } catch { setOn(false); }
    };
    void start();
  }, []);
  return <Button className="sound-toggle" variant="outline" onClick={toggle} aria-label={on ? "关闭大厦音乐" : "开启大厦音乐"}>{on ? <Volume2 /> : <VolumeX />}<span>音乐 {on ? "ON" : "OFF"}</span></Button>;
}
