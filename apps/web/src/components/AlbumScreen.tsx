/** Layar Album (M7 — Doc 12 §9.1): kartu pet aktif, telur, dan pohon silsilah 3 generasi. */
import { eventBus } from "../lib/eventBus";
import { useGameState } from "../store/gameState";
import { ELEMENT_ICON, ELEMENT_LABEL } from "../lib/elements";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const genLabel = (gen: number): string => `Generasi ${ROMAN[gen] ?? gen}`;

export function AlbumScreen() {
  const { album } = useGameState();
  if (!album) return null;

  return (
    <div className="album" role="dialog" aria-label="album keluarga">
      <header className="album__header">
        <button
          type="button"
          className="album__back"
          aria-label="kembali"
          onClick={() => eventBus.emit("ui/album-close", undefined)}
        >
          ‹
        </button>
        <h2 className="album__title">📖 Album Keluarga</h2>
      </header>

      {/* Kartu pet aktif (Doc 12 §9.1) */}
      <section className="album__card album__card--alive">
        <div className="album__avatar" style={{ background: album.pet.coatColor }}>
          {ELEMENT_ICON[album.pet.element] ?? "🦊"}
        </div>
        <div className="album__info">
          <div className="album__name">
            {album.pet.name} <span className="album__tier">{album.pet.path}</span>
          </div>
          <div className="album__meta">
            {genLabel(album.pet.gen)} · hari {album.pet.day} · Care {album.pet.careScore}
          </div>
          <div className="album__meta">
            🧾 Keturunan {album.pet.childrenCount}/4 · {ELEMENT_LABEL[album.pet.element] ?? album.pet.element}
          </div>
        </div>
      </section>

      {/* Kartu telur di altar */}
      {album.egg && (
        <section className="album__card album__card--egg">
          <div className="album__avatar album__avatar--egg" style={{ background: album.egg.coatColor }}>
            🥚
          </div>
          <div className="album__info">
            <div className="album__name">Telur Keturunan {ROMAN[album.egg.gen] ?? album.egg.gen}</div>
            <div className="album__meta">
              {album.egg.parents.map((p) => p.name).join(" × ")} ·{" "}
              {ELEMENT_LABEL[album.egg.element] ?? album.egg.element}
            </div>
          </div>
        </section>
      )}

      {/* Pohon silsilah (maks 3 generasi — Doc 07 §4) */}
      <h3 className="album__sub">🌳 Pohon Keluarga</h3>
      {album.generations.length === 0 ? (
        <p className="album__empty">
          Belum ada silsilah — breed untuk memulai generasi berikutnya.
        </p>
      ) : (
        album.generations.map((row, i) => (
          <section key={i} className="album__gen">
            <div className="album__gen-label">{genLabel(Math.max(1, album.pet.gen - 1 - i))}</div>
            <div className="album__row">
              {row.map((p, j) => (
                <div key={j} className="album__person">
                  <span className="swatch swatch--lg">{ELEMENT_ICON[p.element] ?? "🦊"}</span>
                  <span className="album__person-name">{p.name}</span>
                  <span className="album__person-meta">
                    {p.path}
                    {p.livedDays !== undefined ? ` · ${p.livedDays} hr` : ""}
                    {p.careScore !== undefined ? ` · Care ${p.careScore}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
      <p className="album__note">
        Generasi tinggi membuka bonus koin kenangan lebih besar (+10%/generasi, maks +50%).
      </p>
      <button
        type="button"
        className="album__breed-cta"
        onClick={() => eventBus.emit("ui/breeding-open", undefined)}
      >
        ⛩️ Ke Breeding House
      </button>
    </div>
  );
}
