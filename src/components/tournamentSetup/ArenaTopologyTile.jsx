import "./ArenaTopologyTile.css";

function getGridSize(grid) {
  return grid.reduce(
    (size, [row, column]) => ({
      rows: Math.max(size.rows, row + 1),
      columns: Math.max(size.columns, column + 1),
    }),
    { rows: 1, columns: 1 }
  );
}

export default function ArenaTopologyTile({ topology, isSelected, onSelect }) {
  const { rows, columns } = getGridSize(topology.grid);

  return (
    <button
      className={`arena-topology-tile${
        isSelected ? " arena-topology-tile--selected" : ""
      }`}
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <span className="arena-topology-tile__label">{topology.label}</span>

      <span className="arena-topology-tile__preview" aria-hidden="true">
        <span
          className={`arena-topology-tile__grid arena-topology--${topology.arenaCount}`}
          style={{
            "--arena-rows": rows,
            "--arena-columns": columns,
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
