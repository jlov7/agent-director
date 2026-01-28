export type EdgeLayerState = {
  structure: boolean;
  sequence: boolean;
  io: boolean;
};

type EdgeLayerTogglesProps = {
  layers: EdgeLayerState;
  onChange: (next: EdgeLayerState) => void;
};

export default function EdgeLayerToggles({ layers, onChange }: EdgeLayerTogglesProps) {
  return (
    <div className="edge-toggles">
      <label title="Parent/child span edges">
        <input
          type="checkbox"
          checked={layers.structure}
          onChange={(event) => onChange({ ...layers, structure: event.target.checked })}
        />
        Structure
      </label>
      <label title="Chronological sequence edges">
        <input
          type="checkbox"
          checked={layers.sequence}
          onChange={(event) => onChange({ ...layers, sequence: event.target.checked })}
        />
        Sequence
      </label>
      <label title="Tool call I/O binding edges">
        <input
          type="checkbox"
          checked={layers.io}
          onChange={(event) => onChange({ ...layers, io: event.target.checked })}
        />
        I/O Binding
      </label>
    </div>
  );
}
