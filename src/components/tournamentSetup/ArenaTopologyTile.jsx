import "./ArenaTopologyTile.css";

import "./ArenaTopologyTile.css";

const TOPOLOGY_DRAWING_SIZE = 118;
const TOPOLOGY_GAP = 6;
const TOPOLOGY_OPTICAL_SCALE = {
  1: 0.750,
  2: 1.5,
  3: 1.5,
  4: 1.00,
  5: 0.90,
  6: 1.5,
  7: 1.00,
  8: 1.6,
  9: 1.00,
  10: 1.70,
};

function getGridSize(grid) {
  return grid.reduce(
    (size, [row, column]) => ({
      rows: Math.max(size.rows, row + 1),
      columns: Math.max(size.columns, column + 1),
    }),
    { rows: 1, columns: 1 }
  );
}

function getArenaCellSize(rows, columns) {
  const availableWidth =
    TOPOLOGY_DRAWING_SIZE - TOPOLOGY_GAP * (columns - 1);

  const availableHeight =
    TOPOLOGY_DRAWING_SIZE - TOPOLOGY_GAP * (rows - 1);

  return Math.min(
    availableWidth / columns,
    availableHeight / rows
  );
}

export default function ArenaTopologyTile({
  topology,
  isSelected,
  onSelect,
}) {
  const { rows, columns } = getGridSize(topology.grid);
  const arenaCellSize = getArenaCellSize(rows, columns);
  const opticalScale =
  TOPOLOGY_OPTICAL_SCALE[topology.arenaCount] ?? 1;

  return (
    <button
      className={`arena-topology-tile${
        isSelected ? " arena-topology-tile--selected" : ""
      }`}
      type="button"
      aria-label={`Select ${topology.arenaCount} arena topology`}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <span className="arena-topology-tile__preview" aria-hidden="true">
        <span
          className="arena-topology-tile__grid"
          style={{
            "--arena-rows": rows,
            "--arena-columns": columns,
            "--arena-cell-size": `${arenaCellSize}px`,
            "--arena-gap": `${TOPOLOGY_GAP}px`,
            "--arena-optical-scale": opticalScale,
          }}
        >
          {topology.grid.map(([row, column], index) => (
            <span
              className={`arena-topology-tile__arena${
                topology.primaryIndex === index
                  ? " arena-topology-tile__arena--primary"
                  : ""
              }`}
              key={`${topology.id}-${row}-${column}`}
              style={{
                gridRow: row + 1,
                gridColumn: column + 1,
              }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}