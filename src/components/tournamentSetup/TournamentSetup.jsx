import { useState } from "react";
import ArenaTopologySelector from "./ArenaTopologySelector";
import "./TournamentSetup.css";
import HwarangAnimatedIsotype from "../HwarangAnimatedIsotype";

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
          <p className="tournament-setup__kicker">Tournament Setup</p>
          <div className="tournament-setup__title-row">
  <h1 id="setup-title" className="tournament-setup__title">
    Arena Structure
  </h1>

  <HwarangAnimatedIsotype size={58} />
</div>
          <p className="tournament-setup__subtitle">
            Define the official arena topology for this tournament.
          </p>
        </header>

        <ArenaTopologySelector
          topologies={ARENA_TOPOLOGIES}
          selectedTopologyId={selectedTopologyId}
          onSelectTopology={setSelectedTopologyId}
        />

        <footer className="tournament-setup__footer">
  <div style={{ marginRight: 8 }}>
  <HwarangAnimatedIsotype size={44} />
</div>

  <button className="tournament-setup__action" type="button">
    Create Tournament Structure
  </button>
</footer>
      </section>
    </main>
  );
}
