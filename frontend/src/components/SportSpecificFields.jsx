import { useEffect } from "react";
import { getSportConfig, sportsRegistry, createDefaultSportProfile } from "../lib/sports";

export function SportSpecificFields({
  sport,
  gender = "Male",
  sportProfile = {},
  onChange,
  target,
  onTargetChange,
}) {
  const config = getSportConfig(sport) || sportsRegistry.Athletics;

  // Initialize or reconcile sportProfile when sport changes
  useEffect(() => {
    if (!sportProfile?.sport || sportProfile.sport.toLowerCase() !== config.name.toLowerCase()) {
      const clean = createDefaultSportProfile(config, gender);
      onChange(clean);
    }
  }, [sport, gender]);

  const update = (patch) => {
    const next = { ...sportProfile, sport: config.name, ...patch };

    // Synchronize event label and measurement dynamically
    if (config.hierarchyType === "track_field" || config.hierarchyType === "para_athletics") {
      const disc = config.disciplines?.find(
        (d) => d.name === (patch.discipline || next.discipline),
      );
      if (disc) {
        next.measurement = disc.measurement;
        if (patch.discipline && !disc.events.includes(next.event)) {
          next.event = disc.events[0];
        }
      }
    } else if (config.hierarchyType === "racket") {
      const fmt = config.formats?.find((f) => f.name === (patch.format || next.format));
      if (fmt) {
        if (patch.format && !fmt.events.includes(next.event)) {
          next.event = fmt.events[0];
        }
      }
    } else if (config.hierarchyType === "team_field" || config.hierarchyType === "team_court") {
      const group = config.positionGroups?.find(
        (g) => g.name === (patch.positionGroup || next.positionGroup),
      );
      if (group) {
        if (patch.positionGroup && !group.positions.includes(next.position)) {
          next.position = group.positions[0];
        }
        next.event = next.position;
      }
    } else if (config.hierarchyType === "cricket") {
      const role = config.roles?.find((r) => r.name === (patch.role || next.role));
      if (role) {
        if (patch.role && !role.specializations.includes(next.specialization)) {
          next.specialization = role.specializations[0];
        }
        next.event = next.role;
      }
    } else if (config.hierarchyType === "swimming") {
      next.event = `${next.distance || "100m"} ${next.stroke || "Freestyle"}`;
    } else if (config.hierarchyType === "combat") {
      const style = config.styles?.find((s) => s.name === (patch.style || next.style));
      if (style) {
        if (patch.style && !style.weightCategories.includes(next.weightCategory)) {
          next.weightCategory = style.weightCategories[0];
        }
        next.event = `${next.style} · ${next.weightCategory}`;
      }
    } else if (config.hierarchyType === "target") {
      const disc = config.disciplines?.find(
        (d) => d.name === (patch.discipline || next.discipline),
      );
      if (disc && patch.discipline && !disc.events.includes(next.event)) {
        next.event = disc.events[0];
      }
    } else if (config.hierarchyType === "archery") {
      const cat = config.categories?.find(
        (c) => c.name === (patch.discipline || next.discipline),
      );
      if (cat && patch.discipline && !cat.events.includes(next.event)) {
        next.event = cat.events[0];
      }
    }

    onChange(next);
  };

  const measurement = sportProfile.measurement || config.measurement || {
    unit: "points",
    unitLabel: "points",
    direction: "higher_is_better",
  };

  return (
    <>
      {/* 1. Track & Field (Athletics) */}
      {config.hierarchyType === "track_field" && (
        <>
          <label className="field">
            <span>Athletics discipline</span>
            <select
              value={sportProfile.discipline || config.disciplines[0].name}
              onChange={(e) => update({ discipline: e.target.value })}
            >
              {config.disciplines.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.category})
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Event</span>
            <select
              value={sportProfile.event || ""}
              onChange={(e) => update({ event: e.target.value })}
            >
              {(
                config.disciplines.find(
                  (d) => d.name === (sportProfile.discipline || config.disciplines[0].name),
                )?.events || []
              ).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 2. Racket Sports (Badminton) */}
      {config.hierarchyType === "racket" && (
        <>
          <label className="field">
            <span>Format</span>
            <select
              value={sportProfile.format || config.formats[0].name}
              onChange={(e) => update({ format: e.target.value })}
            >
              {config.formats.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Competition event</span>
            <select
              value={sportProfile.event || ""}
              onChange={(e) => update({ event: e.target.value })}
            >
              {(
                config.formats.find(
                  (f) => f.name === (sportProfile.format || config.formats[0].name),
                )?.events || []
              ).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 3. Team Sports (Football, Basketball) */}
      {(config.hierarchyType === "team_field" || config.hierarchyType === "team_court") && (
        <>
          <label className="field">
            <span>Position group</span>
            <select
              value={sportProfile.positionGroup || config.positionGroups[0].name}
              onChange={(e) => update({ positionGroup: e.target.value })}
            >
              {config.positionGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Specific position / role</span>
            <select
              value={sportProfile.position || ""}
              onChange={(e) => update({ position: e.target.value })}
            >
              {(
                config.positionGroups.find(
                  (g) =>
                    g.name ===
                    (sportProfile.positionGroup || config.positionGroups[0].name),
                )?.positions || []
              ).map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 4. Cricket */}
      {config.hierarchyType === "cricket" && (
        <>
          <label className="field">
            <span>Primary role</span>
            <select
              value={sportProfile.role || config.roles[0].name}
              onChange={(e) => update({ role: e.target.value })}
            >
              {config.roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Specialization / role style</span>
            <select
              value={sportProfile.specialization || ""}
              onChange={(e) => update({ specialization: e.target.value })}
            >
              {(
                config.roles.find(
                  (r) => r.name === (sportProfile.role || config.roles[0].name),
                )?.specializations || []
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Batting stance</span>
            <select
              value={sportProfile.battingStyle || config.battingStyles[0]}
              onChange={(e) => update({ battingStyle: e.target.value })}
            >
              {config.battingStyles.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Bowling style</span>
            <select
              value={sportProfile.bowlingStyle || config.bowlingStyles[0]}
              onChange={(e) => update({ bowlingStyle: e.target.value })}
            >
              {config.bowlingStyles.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 5. Swimming */}
      {config.hierarchyType === "swimming" && (
        <>
          <label className="field">
            <span>Stroke</span>
            <select
              value={sportProfile.stroke || config.strokes[0].name}
              onChange={(e) => update({ stroke: e.target.value })}
            >
              {config.strokes.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Distance</span>
            <select
              value={sportProfile.distance || config.distances[1]}
              onChange={(e) => update({ distance: e.target.value })}
            >
              {config.distances.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 6. Shooting */}
      {config.hierarchyType === "target" && (
        <>
          <label className="field">
            <span>Weapon category</span>
            <select
              value={sportProfile.discipline || config.disciplines[0].name}
              onChange={(e) => update({ discipline: e.target.value })}
            >
              {config.disciplines.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Discipline / event</span>
            <select
              value={sportProfile.event || ""}
              onChange={(e) => update({ event: e.target.value })}
            >
              {(
                config.disciplines.find(
                  (d) => d.name === (sportProfile.discipline || config.disciplines[0].name),
                )?.events || []
              ).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 7. Archery */}
      {config.hierarchyType === "archery" && (
        <>
          <label className="field">
            <span>Bow category</span>
            <select
              value={sportProfile.discipline || config.categories[0].name}
              onChange={(e) => update({ discipline: e.target.value })}
            >
              {config.categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Round / distance</span>
            <select
              value={sportProfile.event || ""}
              onChange={(e) => update({ event: e.target.value })}
            >
              {(
                config.categories.find(
                  (c) => c.name === (sportProfile.discipline || config.categories[0].name),
                )?.events || []
              ).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 8. Wrestling */}
      {config.hierarchyType === "combat" && (
        <>
          <label className="field">
            <span>Wrestling style</span>
            <select
              value={sportProfile.style || config.styles[0].name}
              onChange={(e) => update({ style: e.target.value })}
            >
              {config.styles.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Weight category</span>
            <select
              value={sportProfile.weightCategory || ""}
              onChange={(e) => update({ weightCategory: e.target.value })}
            >
              {(
                config.styles.find(
                  (s) => s.name === (sportProfile.style || config.styles[0].name),
                )?.weightCategories || []
              ).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 9. Weightlifting */}
      {config.hierarchyType === "strength" && (
        <>
          <label className="field">
            <span>Competition weight category</span>
            <select
              value={sportProfile.weightCategory || ""}
              onChange={(e) => update({ weightCategory: e.target.value })}
            >
              {(
                config.weightCategories[gender === "Female" ? "Female" : "Male"] ||
                config.weightCategories.Male
              ).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Primary lift focus</span>
            <select
              value={sportProfile.event || config.lifts[0]}
              onChange={(e) => update({ event: e.target.value })}
            >
              {config.lifts.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* 10. Para Athletics */}
      {config.hierarchyType === "para_athletics" && (
        <>
          <label className="field">
            <span>Para discipline</span>
            <select
              value={sportProfile.discipline || config.disciplines[0].name}
              onChange={(e) => update({ discipline: e.target.value })}
            >
              {config.disciplines.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Event</span>
            <select
              value={sportProfile.event || ""}
              onChange={(e) => update({ event: e.target.value })}
            >
              {(
                config.disciplines.find(
                  (d) => d.name === (sportProfile.discipline || config.disciplines[0].name),
                )?.events || []
              ).map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Official class (T / F category)</span>
            <select
              value={sportProfile.classification || "T47"}
              onChange={(e) => update({ classification: e.target.value })}
            >
              {config.classifications.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Classification status</span>
            <select
              value={sportProfile.classificationStatus || "Self-reported"}
              onChange={(e) => update({ classificationStatus: e.target.value })}
            >
              {config.classificationStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {/* Performance Target with Automatic Unit & Direction Indicator */}
      <div className="field wide" style={{ marginTop: "6px" }}>
        <span>Personal performance target</span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <input
            type="number"
            step="any"
            placeholder={
              measurement.direction === "lower_is_better"
                ? "e.g. 11.90"
                : "e.g. 68.5"
            }
            value={target ?? ""}
            onChange={(e) =>
              onTargetChange(e.target.value === "" ? "" : Number(e.target.value))
            }
            style={{ flex: 1 }}
          />
          <div
            style={{
              padding: "12px 18px",
              background: "#eeeee6",
              border: "1px solid #d4dcc5",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475239",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>Unit: {measurement.unitLabel || measurement.unit}</span>
            <span
              style={{
                fontSize: "10px",
                padding: "2px 6px",
                background: "#dfe4d4",
                color: "#2a331f",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {measurement.direction === "lower_is_better"
                ? "Lower is better"
                : "Higher is better"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
