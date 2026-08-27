import { useState } from "react";
import ArenaTopologySelector from "./ArenaTopologySelector";
import "../../styles/hsu-design-tokens.css";
import HwarangAnimatedIsotype from "../HwarangAnimatedIsotype";
import HSUButton from "../HSUButton/HSUButton";
import HSUTypography from "../HSUTypography/HSUTypography";
import "./TournamentSetup.css";

const ARENA_TOPOLOGIES = [
  {
    id: "arena-1",
    arenaCount: 1,
    label: "1 Arena",
    grid: [[0, 0]],
  },
  {
    id: "arena-2",
    arenaCount: 2,
    label: "2 Arenas",
    grid: [
      [0, 0],
      [0, 1],
    ],
  },
  {
    id: "arena-3",
    arenaCount: 3,
    label: "3 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
  },
  {
    id: "arena-4",
    arenaCount: 4,
    label: "4 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  },
  {
    id: "arena-5",
    arenaCount: 5,
    label: "5 Arenas",
    grid: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 2],
    ],
    primaryIndex: 2,
  },
  {
    id: "arena-6",
    arenaCount: 6,
    label: "6 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
  {
    id: "arena-7",
    arenaCount: 7,
    label: "7 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    primaryIndex: 3,
  },
  {
    id: "arena-8",
    arenaCount: 8,
    label: "8 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
  },
  {
    id: "arena-9",
    arenaCount: 9,
    label: "9 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    primaryIndex: 4,
  },
  {
    id: "arena-10",
    arenaCount: 10,
    label: "10 Arenas",
    grid: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ],
  },
];

export default function TournamentSetup() {
  const [selectedTopologyId, setSelectedTopologyId] = useState(
    ARENA_TOPOLOGIES[0].id
  );

  return (
    <main className="tournament-setup">
      <section className="tournament-setup__content" aria-labelledby="setup-title">
        <header className="tournament-setup__header">

  <HSUTypography
    as="p"
    variant="overline"
    className="tournament-setup__kicker"
  >
    Tournament Setup
  </HSUTypography>

  <div className="tournament-setup__hero">

    <div className="tournament-setup__hero-left">

<HSUTypography
  as="h1"
  variant="display"
  id="setup-title"
  className="tournament-setup__title"
  data-text="Arena Structure"
>
  Arena Structure
</HSUTypography>

    </div>

    <div className="tournament-setup__hero-right">

      <div className="tournament-setup__brand">

        <HwarangAnimatedIsotype size={72} />

        <div className="tournament-setup__brand-text">

<HSUTypography
  as="div"
  variant="title"
  className="tournament-setup__brand-title"
>
  HWARANG
</HSUTypography>

<HSUTypography
  as="div"
  variant="overline"
  className="tournament-setup__brand-subtitle"
>
  SCORING UNIVERSE<sup style={{ fontSize: "0.42em", lineHeight: 0, marginLeft: "0.08em" }}>®</sup>
</HSUTypography>

        </div>

      </div>

    </div>

  </div>

<HSUTypography
  as="p"
  variant="subtitle"
  className="tournament-setup__subtitle"
>
  Define the official arena topology for this tournament.
</HSUTypography>

</header>

        <ArenaTopologySelector
          topologies={ARENA_TOPOLOGIES}
          selectedTopologyId={selectedTopologyId}
          onSelectTopology={setSelectedTopologyId}
        />

        <footer className="tournament-setup__footer">
          <HSUButton variant="gold" size="large">
            Create Tournament Structure
          </HSUButton>
        </footer>
      </section>
    </main>
  );
}
