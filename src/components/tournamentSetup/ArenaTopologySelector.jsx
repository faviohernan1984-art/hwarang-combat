import ArenaTopologyTile from "./ArenaTopologyTile";
import "./ArenaTopologySelector.css";

export default function ArenaTopologySelector({
  topologies,
  selectedTopologyId,
  onSelectTopology,
}) {
  return (
    <section className="arena-topology-selector" aria-label="Arena topology">
      {topologies.map((topology, index) => (
        <ArenaTopologyTile
  key={topology.id}
  topology={topology}
  isSelected={selectedTopologyId === topology.id}
  onSelect={() => onSelectTopology(topology.id)}
  index={index}
/>
      ))}
    </section>
  );
}
