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
      <label
        title="Parent/child span edges"
        data-help
        data-help-title="Structure edges"
        data-help-body="Shows parent-child spans to reveal hierarchy."
        data-help-placement="top"
      >
        <input
          type="checkbox"
          checked={layers.structure}
          onChange={(event) => onChange({ ...layers, structure: event.target.checked })}
        />
        Structure
      </label>
      <label
        title="Chronological sequence edges"
        data-help
        data-help-title="Sequence edges"
        data-help-body="Shows chronological ordering of steps."
        data-help-placement="top"
      >
        <input
          type="checkbox"
          checked={layers.sequence}
          onChange={(event) => onChange({ ...layers, sequence: event.target.checked })}
        />
        Sequence
      </label>
      <label
        title="Tool call I/O binding edges"
        data-help
        data-help-title="I/O edges"
        data-help-body="Connects tool calls to their inputs and outputs."
        data-help-placement="top"
      >
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
