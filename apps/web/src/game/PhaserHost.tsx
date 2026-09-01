/** Jembatan tunggal React ↔ Phaser (Doc 09 §2): React mount/unmount game, tidak lebih. */
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { PlaceholderScene } from "./placeholderScene";

export function PhaserHost() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: container,
      width: 360,
      height: 640,
      backgroundColor: "#F5EFE0",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [PlaceholderScene],
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="game-canvas" />;
}
